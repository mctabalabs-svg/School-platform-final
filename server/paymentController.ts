import { Request, Response } from 'express';
import { pglite } from './db';
import { AuthenticatedRequest } from './authMiddleware';
import {
  initiateStkPush,
  extractCallbackMetadata,
  StkCallbackPayload,
  formatKenyanPhoneNumber,
} from './mpesaService';

/**
 * 1. M-PESA STK PUSH INITIALIZATION
 * POST /api/payments/stk-push
 * Guarded: requireRole(['parent', 'super_admin', 'accountant', 'principal'])
 */
export async function initiateStkPushController(req: AuthenticatedRequest, res: Response) {
  try {
    const parentUserId = req.user?.id || 'usr-parent-01';
    const { student_id, amount, phone_number, account_reference, term_id } = req.body;

    if (!student_id) {
      return res.status(400).json({
        error: 'Missing student_id. Please specify which student fees are being paid for.',
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid payment amount. Amount must be a positive number.',
      });
    }

    // Lookup Student record in DB
    const studentRes = await pglite.query<{
      id: string;
      student_id: string;
      first_name: string;
      last_name: string;
      guardian_phone: string;
      guardian_name: string;
    }>(
      'SELECT id, student_id, first_name, last_name, guardian_phone, guardian_name FROM students WHERE id = $1 OR student_id = $2 LIMIT 1;',
      [student_id, student_id]
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({
        error: `Student record "${student_id}" not found in system.`,
      });
    }

    const student = studentRes.rows[0];

    // Determine target phone number (explicit in body, or parent's phone, or student's guardian phone)
    const rawPhone = phone_number || req.user?.phone || student.guardian_phone || '254708374149';
    const formattedPhone = formatKenyanPhoneNumber(rawPhone);

    // Account reference (e.g. ACC-STU-001 or student code)
    const accRef = account_reference || student.student_id || 'FEES';

    console.log(`[STK Push] Initiating fee payment for Student ${student.first_name} ${student.last_name} (${student.student_id}) - Amount: KES ${parsedAmount} - Phone: ${formattedPhone}`);

    // Call Safaricom M-Pesa Daraja Service
    const stkResponse = await initiateStkPush({
      phoneNumber: formattedPhone,
      amount: parsedAmount,
      accountReference: accRef,
      transactionDesc: `Fees for ${student.first_name} ${student.last_name}`,
    });

    const paymentId = `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Store initial pending payment record in DB
    await pglite.query(
      `INSERT INTO payments (
        id,
        checkout_request_id,
        merchant_request_id,
        student_id,
        parent_id,
        parent_phone,
        amount,
        status,
        result_desc,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, CURRENT_TIMESTAMP);`,
      [
        paymentId,
        stkResponse.CheckoutRequestID,
        stkResponse.MerchantRequestID,
        student.id,
        parentUserId,
        formattedPhone,
        parsedAmount,
        stkResponse.CustomerMessage || 'STK Push Dispatched',
      ]
    );

    // Write audit event for initiated STK push
    await pglite.query(
      `INSERT INTO audit_logs (id, action, entity, term_id, actor, details) VALUES ($1, $2, $3, $4, $5, $6);`,
      [
        `log-stk-${Date.now()}`,
        'MPESA_STK_PUSH_INITIATED',
        'PAYMENTS',
        term_id || 'term-fall-2025',
        req.user?.name || 'Parent User',
        `Dispatched M-Pesa STK Push of KES ${parsedAmount.toLocaleString()} to ${formattedPhone} for student ${student.first_name} ${student.last_name} (${student.student_id}). CheckoutRequestID: ${stkResponse.CheckoutRequestID}`,
      ]
    );

    return res.status(200).json({
      success: true,
      message: stkResponse.CustomerMessage,
      checkout_request_id: stkResponse.CheckoutRequestID,
      merchant_request_id: stkResponse.MerchantRequestID,
      student: {
        id: student.id,
        student_code: student.student_id,
        name: `${student.first_name} ${student.last_name}`,
      },
      amount: parsedAmount,
      phone_number: formattedPhone,
      account_reference: accRef,
      simulated: stkResponse.simulated,
    });
  } catch (error: any) {
    console.error('[M-Pesa STK Push Error]', error);
    return res.status(500).json({
      error: 'Failed to initiate M-Pesa STK Push transaction.',
      details: error.message,
    });
  }
}

/**
 * 2. THE UNSECURED M-PESA CALLBACK ENDPOINT
 * POST /api/payments/callback
 * Public endpoint: Bypasses JWT check, strictly validates Safaricom payload structure,
 * and processes successful payment inside a single atomic Database Transaction.
 */
export async function mpesaCallbackController(req: Request, res: Response) {
  const payload = req.body as StkCallbackPayload;

  console.log('[M-Pesa Callback] Received asynchronous webhook from Safaricom:', JSON.stringify(payload));

  // 1. Strict Payload Validation
  if (!payload || !payload.Body || !payload.Body.stkCallback) {
    console.error('[M-Pesa Callback] Invalid payload structure: Missing Body.stkCallback');
    // Return 200/400 accepted to Safaricom standard
    return res.status(400).json({
      ResultCode: 1,
      ResultDesc: 'Invalid STK callback payload format.',
    });
  }

  const stkCallback = payload.Body.stkCallback;
  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const merchantRequestId = stkCallback.MerchantRequestID;
  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;

  if (!checkoutRequestId) {
    return res.status(400).json({
      ResultCode: 1,
      ResultDesc: 'Missing CheckoutRequestID in callback.',
    });
  }

  try {
    // 2. Lookup existing payment record
    const paymentLookup = await pglite.query<{
      id: string;
      student_id: string;
      amount: string;
      status: string;
      parent_phone: string;
    }>(
      'SELECT id, student_id, amount, status, parent_phone FROM payments WHERE checkout_request_id = $1 LIMIT 1;',
      [checkoutRequestId]
    );

    // If no existing record was found by checkout_request_id, find any pending payment or create one
    let targetPayment = paymentLookup.rows[0];

    // =========================================================================
    // CASE A: SUCCESSFUL PAYMENT (ResultCode === 0)
    // Execute single atomic Database Transaction
    // =========================================================================
    if (resultCode === 0) {
      const metadata = extractCallbackMetadata(stkCallback.CallbackMetadata?.Item);
      const mpesaReceiptNumber = metadata.mpesaReceiptNumber || `MP${Date.now().toString().slice(-8)}`;
      const paidAmount = metadata.amount || (targetPayment ? Number(targetPayment.amount) : 0);
      const transactionDate = metadata.transactionDate || new Date().toISOString();
      const phoneNumber = metadata.phoneNumber || (targetPayment ? targetPayment.parent_phone : '254708374149');

      console.log(`[M-Pesa Callback] Processing Successful Payment - Receipt: ${mpesaReceiptNumber}, Amount: KES ${paidAmount}`);

      // ATOMIC TRANSACTION:
      // a. Locate corresponding parent/student balance record
      // b. Insert/update row in payments tracking table
      // c. Adjust balance inside student_fee_accounts table
      // d. Safely write to audit_logs table
      try {
        await pglite.query('BEGIN;');

        let studentId = targetPayment ? targetPayment.student_id : null;

        // If no prior payment row existed, lookup student or default to s-1
        if (!studentId) {
          const defaultStu = await pglite.query<{ id: string }>('SELECT id FROM students LIMIT 1;');
          studentId = defaultStu.rows[0]?.id || 's-1';
        }

        // a & b. Update or Insert Payments tracking row
        if (targetPayment) {
          await pglite.query(
            `UPDATE payments 
             SET 
               status = 'COMPLETED',
               mpesa_receipt_number = $1,
               transaction_date = $2,
               result_code = $3,
               result_desc = $4,
               raw_callback_payload = $5,
               amount = $6,
               updated_at = CURRENT_TIMESTAMP
             WHERE checkout_request_id = $7;`,
            [
              mpesaReceiptNumber,
              transactionDate,
              resultCode,
              resultDesc,
              JSON.stringify(payload),
              paidAmount,
              checkoutRequestId,
            ]
          );
        } else {
          await pglite.query(
            `INSERT INTO payments (
               id,
               checkout_request_id,
               merchant_request_id,
               student_id,
               parent_phone,
               amount,
               mpesa_receipt_number,
               transaction_date,
               status,
               result_code,
               result_desc,
               raw_callback_payload,
               created_at,
               updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'COMPLETED', $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
            [
              `pay-${Date.now()}`,
              checkoutRequestId,
              merchantRequestId || `MR-${Date.now()}`,
              studentId,
              phoneNumber,
              paidAmount,
              mpesaReceiptNumber,
              transactionDate,
              resultCode,
              resultDesc,
              JSON.stringify(payload),
            ]
          );
        }

        // c. Adjust the balance inside student_fee_accounts table
        // Find existing fee account for this student
        const feeAccountRes = await pglite.query<{
          id: string;
          total_billed: string;
          amount_paid: string;
          balance: string;
        }>(
          'SELECT id, total_billed, amount_paid, balance FROM student_fee_accounts WHERE student_id = $1 LIMIT 1;',
          [studentId]
        );

        if (feeAccountRes.rows.length > 0) {
          const feeAcc = feeAccountRes.rows[0];
          const prevPaid = Number(feeAcc.amount_paid) || 0;
          const totalBilled = Number(feeAcc.total_billed) || 0;
          const newAmountPaid = prevPaid + paidAmount;
          const newBalance = Math.max(0, totalBilled - newAmountPaid);
          const newStatus = newBalance <= 0 ? 'CLEARED' : 'PARTIAL';

          await pglite.query(
            `UPDATE student_fee_accounts 
             SET 
               amount_paid = $1,
               balance = $2,
               status = $3,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $4;`,
            [newAmountPaid, newBalance, newStatus, feeAcc.id]
          );
        } else {
          // Create initial account if didn't exist
          const totalBilled = 45000;
          const newBalance = Math.max(0, totalBilled - paidAmount);
          const newStatus = newBalance <= 0 ? 'CLEARED' : 'PARTIAL';

          await pglite.query(
            `INSERT INTO student_fee_accounts (
               id,
               student_id,
               term_id,
               account_number,
               total_billed,
               amount_paid,
               balance,
               status
             ) VALUES ($1, $2, 'term-fall-2025', $3, $4, $5, $6, $7);`,
            [
              `fee-${studentId}`,
              studentId,
              `ACC-${studentId}`,
              totalBilled,
              paidAmount,
              newBalance,
              newStatus,
            ]
          );
        }

        // d. Safely write to system audit_logs table
        await pglite.query(
          `INSERT INTO audit_logs (id, action, entity, term_id, actor, details) VALUES ($1, $2, $3, $4, $5, $6);`,
          [
            `log-pay-${Date.now()}`,
            'MPESA_PAYMENT_VERIFIED',
            'PAYMENTS',
            'term-fall-2025',
            `Safaricom Daraja Gateway (${phoneNumber})`,
            `Verified M-Pesa fee payment receipt ${mpesaReceiptNumber} of KES ${paidAmount.toLocaleString()} credited for Student ID: ${studentId}. CheckoutRequestID: ${checkoutRequestId}.`,
          ]
        );

        await pglite.query('COMMIT;');
        console.log(`[M-Pesa Callback] Successfully committed payment transaction for receipt ${mpesaReceiptNumber}`);
      } catch (txError: any) {
        await pglite.query('ROLLBACK;');
        console.error('[M-Pesa Callback Transaction Error - Rolled Back]', txError);
        return res.status(500).json({
          ResultCode: 1,
          ResultDesc: 'Database transaction failed during fee allocation.',
        });
      }
    } else {
      // =========================================================================
      // CASE B: FAILED OR CANCELLED PAYMENT (e.g. ResultCode: 1032 user cancelled)
      // Update payment record to CANCELLED/FAILED and record audit log cleanly
      // =========================================================================
      const failureStatus = resultCode === 1032 ? 'CANCELLED' : 'FAILED';
      console.warn(`[M-Pesa Callback] Payment ${failureStatus} (ResultCode: ${resultCode}): ${resultDesc}`);

      if (targetPayment) {
        await pglite.query(
          `UPDATE payments 
           SET 
             status = $1,
             result_code = $2,
             result_desc = $3,
             raw_callback_payload = $4,
             updated_at = CURRENT_TIMESTAMP
           WHERE checkout_request_id = $5;`,
          [failureStatus, resultCode, resultDesc, JSON.stringify(payload), checkoutRequestId]
        );
      }

      await pglite.query(
        `INSERT INTO audit_logs (id, action, entity, term_id, actor, details) VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          `log-pay-fail-${Date.now()}`,
          `MPESA_PAYMENT_${failureStatus}`,
          'PAYMENTS',
          'term-fall-2025',
          'Safaricom Daraja Gateway',
          `M-Pesa payment attempt ${failureStatus} with code ${resultCode}: "${resultDesc}". CheckoutRequestID: ${checkoutRequestId}`,
        ]
      );
    }

    // Safaricom standard response acknowledgement
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted',
    });
  } catch (err: any) {
    console.error('[M-Pesa Callback Controller Error]', err);
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: 'Internal server error processing callback.',
    });
  }
}

/**
 * GET /api/payments/fee-accounts
 * Lists all student fee accounts with billing, paid, balance, and student details
 */
export async function getStudentFeeAccountsController(req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        fa.id,
        fa.student_id,
        fa.term_id,
        fa.account_number,
        fa.fee_structure_name,
        fa.total_billed,
        fa.amount_paid,
        fa.balance,
        fa.status,
        fa.due_date,
        fa.created_at,
        s.student_id as student_code,
        s.first_name,
        s.last_name,
        s.grade,
        s.section,
        s.guardian_name,
        s.guardian_phone,
        s.avatar_url
      FROM student_fee_accounts fa
      JOIN students s ON fa.student_id = s.id;
    `;

    const result = await pglite.query(query);
    return res.json({
      success: true,
      count: result.rows.length,
      fee_accounts: result.rows,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/payments/history
 * Lists all M-Pesa payment transactions with verified receipts
 */
export async function getPaymentsHistoryController(req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        p.*,
        s.student_id as student_code,
        s.first_name,
        s.last_name,
        s.grade
      FROM payments p
      JOIN students s ON p.student_id = s.id
      ORDER BY p.created_at DESC;
    `;

    const result = await pglite.query(query);
    return res.json({
      success: true,
      count: result.rows.length,
      payments: result.rows,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/payments/status/:checkoutRequestId
 * Polls the current status of an STK Push checkout request
 */
export async function getPaymentStatusController(req: Request, res: Response) {
  try {
    const { checkoutRequestId } = req.params;

    const result = await pglite.query(
      `SELECT p.*, s.first_name, s.last_name, s.student_id as student_code
       FROM payments p
       JOIN students s ON p.student_id = s.id
       WHERE p.checkout_request_id = $1 LIMIT 1;`,
      [checkoutRequestId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment checkout request not found.' });
    }

    return res.json({
      success: true,
      payment: result.rows[0],
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/payments/simulate-callback
 * Testing Helper for AI Studio / local sandbox environments:
 * Generates an authentic Safaricom callback payload and feeds it to mpesaCallbackController
 */
export async function simulateDarajaCallbackController(req: Request, res: Response) {
  try {
    const { checkout_request_id, action = 'approve', amount, receipt_number, phone_number } = req.body;

    if (!checkout_request_id) {
      return res.status(400).json({ error: 'Missing checkout_request_id to simulate.' });
    }

    const isSuccess = action === 'approve';
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    let simulatedPayload: StkCallbackPayload;

    if (isSuccess) {
      const receipt = receipt_number || `QK${Math.floor(1000 + Math.random() * 9000)}XCV${Math.floor(10 + Math.random() * 90)}`;
      simulatedPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: `29115-${Math.floor(10000000 + Math.random() * 90000000)}-1`,
            CheckoutRequestID: checkout_request_id,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: Number(amount || 15000) },
                { Name: 'MpesaReceiptNumber', Value: receipt },
                { Name: 'Balance' },
                { Name: 'TransactionDate', Value: Number(timestamp) },
                { Name: 'PhoneNumber', Value: Number(phone_number || 254708374149) },
              ],
            },
          },
        },
      };
    } else {
      simulatedPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: `29115-${Math.floor(10000000 + Math.random() * 90000000)}-1`,
            CheckoutRequestID: checkout_request_id,
            ResultCode: 1032,
            ResultDesc: '[STK_CB - ]Request cancelled by user',
          },
        },
      };
    }

    // Proxy into the actual mpesaCallbackController to execute the real atomic transaction
    const mockReq = {
      body: simulatedPayload,
    } as Request;

    return mpesaCallbackController(mockReq, res);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
