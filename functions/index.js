const functions = require("firebase-functions");

// The Firebase Admin SDK to access Firestore.
const admin = require('firebase-admin');
const PaytmChecksum = require('paytmchecksum');
const sgMail = require("@sendgrid/mail");
const cors = require("cors")({
  origin: true
});
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const express = require('express');
const bodyParser = require("body-parser");
var axios = require("axios");
admin.initializeApp();
const sgClient = require('@sendgrid/client');
sgClient.setApiKey("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");

const app = express();
const main = express();

main.use('/api/', app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));
// webApi is your functions name, and you will pass main as 
// a parameter
exports.webApi = functions.https.onRequest(main);

const PAYTM_MID = "ASTROC45568948395662";
const PAYTM_MKEY = "i&36UQCFDwc2GdeF";

// const PAYTM_MID = "rKzjvm67337748181800";
// const PAYTM_MKEY = "YzZXigSQSE9%f9@A";

function fcm_notification(type, topic_or_token_id, title, body, data_body) {
  var payload = {};
  if (type == "token") {
    payload = {
      token: topic_or_token_id,
      notification: {
        title: title,
        body: body
      },
      data: data_body,
    };
  }
  else {
    payload = {
      topic: topic_or_token_id,
      notification: {
        title: title,
        body: body
      },
      data: data_body,
    };
  }

  console.log(payload);
  admin.messaging().send(payload).then((response) => {
    // Response is a message ID string.
    console.log('Successfully sent message:', response);
    return { success: true };
  }).catch((error) => {
    return { error: error.code };
  });

}


function updateAstrologerBalance(astrologerId, totalAmount, subtypeId, subtype) {
  admin.firestore().collection('app_details').doc("money").get().then((moneyRef) => {

    moneyData = moneyRef.data();
    astrologerAmount = totalAmount * ((100 - moneyData.commission) / 100);
    astrologerAmount = astrologerAmount.toFixed(2);
    status1 = db.collection('astrologer').doc(astrologerId).collection('privateInfo').doc(astrologerId).update({ "walletBalance": admin.firestore.FieldValue.increment(+astrologerAmount) });
    status = db.collection('astrologer').doc(astrologerId).collection('privateInfo').doc(astrologerId).update({ "earnings": admin.firestore.FieldValue.increment(+astrologerAmount) });
    status2 = db.collection('astrologer').doc(astrologerId).collection("astologer_wallet_transaction").add({ "subtypeId": subtypeId, "amount": +astrologerAmount, "type": "credit", "subtype": subtype, "date": admin.firestore.FieldValue.serverTimestamp() });
    adminAmount = totalAmount - astrologerAmount;
    db.collection("app_details").doc("money").update({ "adminBalance": admin.firestore.FieldValue.increment(+adminAmount) });
    db.collection("app_details").doc("money").collection("admin_wallet_transaction").add({ "subtypeId": subtypeId, "amount": +adminAmount, "type": "credit", "subtype": subtype, "date": admin.firestore.FieldValue.serverTimestamp() });
    if (subtype == "meeting") {
      db.collection('meetings').doc(subtypeId).update({ "astrologerAmount": admin.firestore.FieldValue.increment(+astrologerAmount) });
    }
  });

}

function addMoneyToWallet(user, amount, orderID) {
  admin.firestore().collection('app_details').doc("money").get().then((moneyRef) => {
    moneyData = moneyRef.data();
    userAmount = amount * ((100) / (100 + moneyData.gst));
    gst = amount - userAmount;
    gst = gst.toFixed(2);
    userAmount = userAmount.toFixed(2);
    console.log(gst);
    console.log(userAmount);
    db.collection("app_details").doc("money").update({ "gstCollected": admin.firestore.FieldValue.increment(+gst) });

    admin.firestore()
      .collection("user")
      .doc(user)
      .update({ "walletBalance": admin.firestore.FieldValue.increment(+userAmount) });

    admin.firestore()
      .collection('user')
      .doc(user)
      .collection("wallet_transaction")
      .add({ "subtypeId": orderID, "amount": +userAmount, "type": "credit", "subtype": "payment", "date": admin.firestore.FieldValue.serverTimestamp() });
  });
}

function addCashbackMoney(user, amount, orderID, cashbackName) {
  db.collection("app_details").doc("money").update({ "cashbackCount": admin.firestore.FieldValue.increment(1) });
  db.collection("app_details").doc("money").update({ "cashbackAmount": admin.firestore.FieldValue.increment(+amount) });

  db.collection("user")
    .doc(user)
    .update({ "walletBalance": admin.firestore.FieldValue.increment(+amount) });

  db.collection("user")
    .doc(user)
    .update({ "rechargeCount": admin.firestore.FieldValue.increment(1) });

  db.collection('user')
    .doc(user)
    .collection("wallet_transaction")
    .add({ "subtypeId": orderID, "amount": +amount, "type": "credit", "subtype": "cashback", "date": admin.firestore.FieldValue.serverTimestamp() });

  db.collection('cashback')
    .doc(cashbackName)
    .update({ 'useCount': admin.firestore.FieldValue.increment(1) });
}

function updateAstrologerBalance2(astrologerId, astrologerAmount, subtypeId, subtype) {
  admin.firestore().collection('app_details').doc("money").get().then((moneyRef) => {
    moneyData = moneyRef.data();
    if (astrologerAmount < 0) {
      astrologerAmount = astrologerAmount * (100 / (100 - moneyData.tds));
      astrologerAmount = astrologerAmount.toFixed(2);
      status1 = db.collection('astrologer').doc(astrologerId).collection('privateInfo').doc(astrologerId).update({ "walletBalance": admin.firestore.FieldValue.increment(+astrologerAmount) });
      status2 = db.collection('astrologer').doc(astrologerId).collection("astologer_wallet_transaction").add({ "subtypeId": subtypeId, "amount": -astrologerAmount, "type": "debit", "subtype": subtype, "date": admin.firestore.FieldValue.serverTimestamp() });
    }
    else if (astrologerAmount > 0) {
      astrologerAmount = astrologerAmount * (100 / (100 - moneyData.tds));
      astrologerAmount = astrologerAmount.toFixed(2);
      status1 = db.collection('astrologer').doc(astrologerId).collection('privateInfo').doc(astrologerId).update({ "walletBalance": admin.firestore.FieldValue.increment(+astrologerAmount) });
      status2 = db.collection('astrologer').doc(astrologerId).collection("astologer_wallet_transaction").add({ "subtypeId": subtypeId, "amount": +astrologerAmount, "type": "credit", "subtype": subtype, "date": admin.firestore.FieldValue.serverTimestamp() });
    }
  });
}

function updateAstrologerCurrentStatus(astrologerId, available) {
  if (available)
    admin.firestore().collection('astrologer').doc(astrologerId).update({ "currentStatus": "Online" });
  else
    admin.firestore().collection('astrologer').doc(astrologerId).update({ "currentStatus": "Busy" });
}

function updateMeetingMetrics(astrologerId, userId, totalDuration, type) {
  if (type == "chat") {
    admin.firestore().collection('astrologer').doc(astrologerId).update({ chatSeconds: admin.firestore.FieldValue.increment(totalDuration * 60) });
    admin.firestore().collection('user').doc(userId).update({ chatSeconds: admin.firestore.FieldValue.increment(totalDuration * 60) });
  }
  if (type == "voice") {
    admin.firestore().collection('astrologer').doc(astrologerId).update({ voiceSeconds: admin.firestore.FieldValue.increment(totalDuration * 60) });
    admin.firestore().collection('user').doc(userId).update({ voiceSeconds: admin.firestore.FieldValue.increment(totalDuration * 60) });
  }
  if (type == "video") {
    admin.firestore().collection('astrologer').doc(astrologerId).update({ videoSeconds: admin.firestore.FieldValue.increment(totalDuration * 60) });
    admin.firestore().collection('user').doc(userId).update({ videoSeconds: admin.firestore.FieldValue.increment(totalDuration * 60) });
  }
}

app.post('/intiatetransaction/', async (req, response) => {
  if (
    req.body &&
    req.body.user &&
    req.body.orderId &&
    req.body.amount
  ) {
    const writeResult1 = await admin.firestore().collection('payments').doc(req.body['orderId']).set({ "user": req.body['user'], "order": req.body['orderId'], status: "Initiated", "amount": req.body['amount'] });

    var paytmParams = {};
    callbackUrl = "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=";
    callbackUrl = callbackUrl.concat(req.body['orderId']);
    console.log(callbackUrl);

    body = { "requestType": "Payment", "mid": PAYTM_MID, "websiteName": "astrocharcha", "orderId": req.body['orderId'], "callbackUrl": callbackUrl, "txnAmount": { "value": req.body['amount'], "currency": "INR", }, "userInfo": { "custId": req.body['user'], }, };
    paytmParams.body = { "requestType": "Payment", "mid": PAYTM_MID, "websiteName": "astrocharcha", "orderId": req.body['orderId'], "callbackUrl": callbackUrl, "txnAmount": { "value": req.body['amount'], "currency": "INR", }, "userInfo": { "custId": req.body['user'], }, };

    console.log(JSON.stringify(paytmParams.body));

    PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), PAYTM_MKEY).then(function (result) {
      console.log(result);
      var post_data = {
        body: paytmParams.body,
        head: { signature: result },
      };

      var paytmInitTransactionAPIUrl = `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${paytmParams.body.mid}&orderId=${paytmParams.body.orderId}`;
      return axios
        .post(paytmInitTransactionAPIUrl, post_data)
        .then((res) => {
          console.log(res.data);
          return response.send(res.data);
        })
        .catch((err) => {
          response.status(500).send(err);
        });
    })
      .catch((error) => {
        response.status(500).send(error);
      });
  } else {
    response
      .status(401)
      .send('{"message": "Invalid Data"}');
  }

})

app.post('/refund/', async (req, res) => {

  try {
    var user = req.body['user'];
    var amount = req.body['amount'];
  }
  catch {
    res.status(400).send(`{ "message" : "Required Parameters Missing" }`);
  }

  try {
    status1 = db.collection('user').doc(user).update({ "walletBalance": admin.firestore.FieldValue.increment(+amount) });
    status2 = db.collection('user').doc(user).collection("wallet_transaction").add({ "subtypeId": "", "amount": +amount, "type": "credit", "subtype": "", "date": admin.firestore.FieldValue.serverTimestamp() });
  }
  catch {
    res.status(400).send(`{ "message" : "Something Wrong Happenned" }`);
  }

  res.status(201).send(`{ "message" : "true" }`);

})


app.post('/updatetransaction/', async (req, res) => {

  console.log(req.body);

  /* string we need to verify against checksum */
  admin.firestore().collection('payments').doc(req.body['ORDERID']).get().then((paymentRef) => {
    paymentData = paymentRef.data();
    callbackUrl = "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=";
    callbackUrl = callbackUrl.concat(req.body['ORDERID']);
    var body = { "requestType": "Payment", "mid": PAYTM_MID, "websiteName": "astrocharcha", "orderId": req.body['ORDERID'], "callbackUrl": callbackUrl, "txnAmount": { "value": req.body['TXNAMOUNT'], "currency": "INR", }, "userInfo": { "custId": paymentData.user, }, };

    console.log(paymentData);

    /* checksum that we need to verify */
    var paytmChecksum = req.body['CHECKSUMHASH'];

    var isVerifySignature = PaytmChecksum.verifySignature(JSON.stringify(body), PAYTM_MKEY, paytmChecksum);
    if (isVerifySignature) {
      console.log("Checksum Matched");
    } else {
      console.log("Checksum Mismatched");
    }

    if (req.body['STATUS'] == 'TXN_SUCCESS') {
      addMoneyToWallet(paymentData.user, req.body['TXNAMOUNT'], req.body['ORDERID']);

      var amount = req.body['TXNAMOUNT'];

      var invoiceNo = 0

      adminRef = admin.firestore().collection('app_details').doc('adminDetails');
      admin.firestore().runTransaction((transaction) => {
        return transaction.get(adminRef).then((res) => {

          if (!res.exists) {
            throw "Document does not exist!";
          }

          var newInvoiceNo = res.data().currentInvoiceNo + 1;
          invoiceNo = newInvoiceNo;

          functions.logger.log(newInvoiceNo);

          transaction.update(adminRef, {
            "currentInvoiceNo": newInvoiceNo,
          });

        });

      });

      admin.firestore().collection('payments')
        .doc(req.body['ORDERID'])
        .update({ "invoiceNo": +invoiceNo, "status": req.body['STATUS'], "txnId": req.body['TXNID'] });

      admin.firestore().collection('app_details').doc("money").get().then((moneyRef) => {
        moneyData = moneyRef.data();
        var userAmount = amount * ((100) / (100 + moneyData.gst));
        var gst = amount - userAmount;
        gst = gst.toFixed(2);
        var addedAmount = userAmount.toFixed(2);
        var gstPercent = moneyData.gst;

        admin.firestore().collection("user").doc(paymentData.user).get().then((userRef) => {
          data = userRef.data();
          const msg = {
            from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
            to: data['email'],
            templateId: "d-f1edfa12bbd84263af4d28493a056f4a",
            dynamic_template_data: {
              amount: amount,
              addedAmount: addedAmount,
              gstAmount: gst,
              gst: gstPercent,
              invoiceNo: invoiceNo,
              orderId: req.body['ORDERID'],
              firstName: data.firstName,
              lastName: data.lastName
            },
          };

          sgMail.send(msg);
        });

      });
    }
    else {
      admin.firestore().collection('payments').doc(req.body['ORDERID']).update({ "status": req.body['STATUS'], "txnId": req.body['TXNID'] });
    }

  })



  res.status(201).send('Transaction Successful');

})

app.post('/updatetransaction_v2/', async (req, res) => {
  console.log(req.body);

  /* string we need to verify against checksum */
  admin.firestore().collection('payments').doc(req.body['ORDERID']).get().then((paymentRef) => {
    paymentData = paymentRef.data();
    callbackUrl = "https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=";
    callbackUrl = callbackUrl.concat(req.body['ORDERID']);
    var body = { "requestType": "Payment", "mid": PAYTM_MID, "websiteName": "astrocharcha", "orderId": req.body['ORDERID'], "callbackUrl": callbackUrl, "txnAmount": { "value": req.body['TXNAMOUNT'], "currency": "INR", }, "userInfo": { "custId": paymentData.user, }, };

    console.log(paymentData);

    /* checksum that we need to verify */
    var paytmChecksum = req.body['CHECKSUMHASH'];

    var isVerifySignature = PaytmChecksum.verifySignature(JSON.stringify(body), PAYTM_MKEY, paytmChecksum);
    if (isVerifySignature) {
      console.log("Checksum Matched");
    } else {
      console.log("Checksum Mismatched");
    }

    if (req.body['STATUS'] == 'TXN_SUCCESS') {
      addMoneyToWallet(paymentData.user, req.body['TXNAMOUNT'], req.body['ORDERID']);

      if (req.body['CASHBACK_ID'] != '') {
        db.collection('cashback')
          .doc(req.body['CASHBACK_ID']).get().then((cashbackRef) => {
            addCashbackMoney(paymentData.user, cashbackRef.data.cashback, '')
          });
      }

      let amount = req.body['TXNAMOUNT'];
      let invoiceNo = 0

      adminRef = admin.firestore().collection('app_details').doc('adminDetails');
      admin.firestore().runTransaction((transaction) => {
        return transaction.get(adminRef).then((res) => {

          if (!res.exists) {
            throw "Document does not exist!";
          }

          let newInvoiceNo = res.data().currentInvoiceNo + 1;
          invoiceNo = newInvoiceNo;

          functions.logger.log(newInvoiceNo);

          transaction.update(adminRef, {
            "currentInvoiceNo": newInvoiceNo,
          });

        });

      });

      admin.firestore()
        .collection('payments')
        .doc(req.body['ORDERID'])
        .update({ "invoiceNo": +invoiceNo, "status": req.body['STATUS'], "txnId": req.body['TXNID'] });

      admin.firestore().collection('app_details').doc("money").get().then((moneyRef) => {
        moneyData = moneyRef.data();
        let userAmount = amount * ((100) / (100 + moneyData.gst));
        let gst = amount - userAmount;
        gst = gst.toFixed(2);
        let addedAmount = userAmount.toFixed(2);
        let gstPercent = moneyData.gst;

        admin.firestore().collection("user").doc(paymentData.user).get().then((userRef) => {
          data = userRef.data();
          const msg = {
            from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
            to: data['email'],
            templateId: "d-f1edfa12bbd84263af4d28493a056f4a",
            dynamic_template_data: {
              amount: amount,
              addedAmount: addedAmount,
              gstAmount: gst,
              gst: gstPercent,
              invoiceNo: invoiceNo,
              orderId: req.body['ORDERID'],
              firstName: data.firstName,
              lastName: data.lastName
            },
          };

          sgMail.send(msg);
        });

      });
    }
    else {
      admin.firestore()
        .collection('payments')
        .doc(req.body['ORDERID'])
        .update({ "status": req.body['STATUS'], "txnId": req.body['TXNID'] });
    }

  })

  res.status(201).send('Transaction Successful');
})

function deductAmount(meetingAmount, meetingId, userId, res, time) {

  admin.firestore().collection('meetings').doc(meetingId).update({ "totalAmount": admin.firestore.FieldValue.increment(+meetingAmount), "lastAmountDeduct": +meetingAmount, "totalDuration": admin.firestore.FieldValue.increment(time) });

  tuserRef = db.collection('user').doc(userId);

  admin.firestore().runTransaction((transaction) => {
    return transaction.get(tuserRef).then((result) => {

      tuserData = result.data();

      if (tuserData.walletBalance < meetingAmount) {
        res.status(400).send(`{ "message" : "Insufficient balance" }`);
      }

      transaction.update(tuserRef, { "walletBalance": admin.firestore.FieldValue.increment(-meetingAmount) });

    });
  });

  status2 = db.collection('user').doc(userId).collection("wallet_transaction").add({ "subtypeId": meetingId, "amount": +meetingAmount, "type": "debit", "subtype": "meeting", "date": admin.firestore.FieldValue.serverTimestamp() });

  // admin.firestore().collection('user').doc(userId).get().then((userRef)=> {
  //     userData = userRef.data();
  //     fcm_notification("token",userData.tokens[userData.tokens.length-1],"Wallet Balance Debited","Wallet Balance debited for meeting",{"type": "debit"});
  // })

  res.status(201).send(`{ "message" : "true" }`);
}


app.post('/deductAmount/', async (req, res) => {

  try {
    var time = req.body['time'];
    var meetingId = req.body['meetingId'];
  }
  catch {
    res.status(400).send(`{ "message" : "Required Parameters Missing" }`);
  }

  console.log(meetingId);
  db.collection('meetings').doc(meetingId).get().then((meetingRef) => {
    meetingData = meetingRef.data();
    db.collection('astrologer').doc(meetingData.astrologerUid).get().then((astrologerRef) => {
      astrologerData = astrologerRef.data();
      db.collection('user').doc(meetingData.userUid).get().then((userRef) => {
        userData = userRef.data();
        meetingRate = meetingData.consultationRate;
        meetingAmount = meetingRate * time;
        discount = 0;

        if (meetingData.coupon != null && meetingData.coupon != "") {
          db.collection('coupon').doc(meetingData.coupon).get().then((couponRef) => {
            couponData = couponRef.data();

            if (couponData != null) {

              if (couponData.live && (couponData.categoryType == meetingData.type || couponData.categoryType == "all")) {
                if (couponData.discountType == "percent")
                  discount = (couponData.discount / 100) * meetingAmount;
                else
                  discount = couponData.discount;

                if (discount > couponData.maxDiscount) {
                  discount = couponData.maxDiscount;
                }

                discount = discount.toFixed(2);

                db.collection('coupon').doc(meetingData.coupon).collection('uses').doc(meetingData.userUid).get().then((useRef) => {
                  useData = useRef.data();
                  if (useData != null) {
                    if (useData.useCount < couponData.limit) {
                      if ((useData.totalDiscount + discount) > couponData.maxTotalDiscount) {
                        discount = couponData.maxTotalDiscount - useData.totalDiscount;
                        if (discount > meetingAmount)
                          discount = meetingAmount;
                      }
                      db.collection('coupon').doc(meetingData.coupon).collection('uses').doc(meetingData.userUid).update({ "useCount": admin.firestore.FieldValue.increment(1), "totalDiscount": admin.firestore.FieldValue.increment(+discount) });
                    }
                    else {
                      discount = 0;
                    }
                    meetingAmount = meetingAmount - discount;
                    meetingAmount = meetingAmount.toFixed(2);
                    deductAmount(meetingAmount, meetingId, meetingData.userUid, res, time);
                  }
                  else {
                    db.collection('coupon').doc(meetingData.coupon).collection('uses').doc(meetingData.userUid).set({ "useCount": 1, "totalDiscount": +discount });
                    meetingAmount = meetingAmount - discount;
                    meetingAmount = meetingAmount.toFixed(2);
                    deductAmount(meetingAmount, meetingId, meetingData.userUid, res, time);
                  }
                });

              }
            }
            else {
              meetingAmount = meetingAmount - discount;
              meetingAmount = meetingAmount.toFixed(2);
              deductAmount(meetingAmount, meetingId, meetingData.userUid, res, time);
            }

          });
        }
        else {
          meetingAmount = meetingAmount - discount;
          meetingAmount = meetingAmount.toFixed(2);
          deductAmount(meetingAmount, meetingId, meetingData.userUid, res, time);
        }

      });
    });
  });

})

app.post('/deductBroadcastAmount/', async (req, res) => {

  try {
    var time = req.body['time'];
    var broadcastId = req.body['meetingId'];
    var userId = req.body['userId'];
  }
  catch {
    res.status(400).send(`{ "message" : "Required Parameters Missing" }`);
  }

  db.collection('broadcasts').doc(broadcastId).get().then((broadcastRef) => {
    broadcastData = broadcastRef.data();
    db.collection('astrologer').doc(broadcastData.astrologerUid).get().then((astrologerRef) => {
      astrologerData = astrologerRef.data();
      db.collection('user').doc(userId).get().then((userRef) => {
        userData = userRef.data();
        broadcastRate = broadcastData.consultationRate;
        amount = broadcastRate * time;
        console.log(amount);

        tuserRef = db.collection('user').doc(userId);

        admin.firestore().runTransaction((transaction) => {
          return transaction.get(tuserRef).then((result) => {

            tuserData = result.data();

            if (tuserData.walletBalance < amount) {
              res.status(400).send(`{ "message" : "Insufficient balance" }`);
            }

            transaction.update(tuserRef, { "walletBalance": admin.firestore.FieldValue.increment(-amount) });

          });
        });

        status2 = db.collection('user').doc(userId).collection("wallet_transaction").add({ "subtypeId": broadcastId, "amount": +amount, "type": "debit", "subtype": "broadcast", "date": admin.firestore.FieldValue.serverTimestamp() });

        fcm_notification("token", userData.tokens[userData.tokens.length - 1], "Wallet Balance Debited", "Wallet Balance debited for broadcast", { "type": "debit" });

        updateAstrologerBalance(broadcastData.astrologerUid, amount, broadcastId, "broadcast");

        res.status(201).send(`{ "message" : "true" }`);

      });
    });
  });

})

app.get('/getAgoraToken/', async (req, res) => {

  const appID = "53d641235d0c426eb4f72f9dc432de78";
  const appCertificate = "myAppCertificate";
  const uid = req.body['userId'];
  const channelId = req.body['meetingId'];
  const role = RtcRole.PUBLISHER;

  const expirationTimeInSeconds = 18000;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const token = RtcTokenBuilder.buildTokenWithUid(appID,
    appCertificate, channelId, uid, role, privilegeExpiredTs);

  res.status(200).send(token);

})

const db = admin.firestore();
sgMail.setApiKey(
  "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"
);
// const Razorpay = require("razorpay");
// var key_id = "rzp_test_5ViLvtlH2dJ4ku";
// var key_secret = "LOMZVFSYU2ysVvS5O5T7qHpR";

exports.onMeetingUpdate = functions.firestore.document('/meetings/{meetingId}')
  .onUpdate(async (change, context) => {
    // Grab the current value of what was written to Firestore.

    const originalData = change.before.data();
    const updatedData = change.after.data();

    if (originalData.status == "cancelled" || originalData.status == "missed") {
      admin.firestore().collection('meetings').doc(context.params.meetingId).update({ "status": originalData.status });
    }

    if (originalData.status == "accepted" && updatedData.status == "ongoing") {
      // console.log("Ongoing notification");
      updateAstrologerCurrentStatus(updatedData.astrologerUid, false);
      //   admin.firestore().collection('astrologer').doc(updatedData.astrologerUid).get().then((astrologerRef) => {

      //   astrologerData = astrologerRef.data();
      //   console.log(astrologerData.tokens);
      //   admin.firestore().collection('user').doc(updatedData.userUid).get().then((userRef) => {

      //     userData = userRef.data();

      //     // fcm_notification("token",astrologerData.tokens[astrologerData.tokens.length-1],"Meeting started","Please join the meeting",{"type": "meetingStarted"});
      //     // fcm_notification("token",userData.tokens[userData.tokens.length-1],"Meeting Started","Please join the meeting",{"type": "meetingStarted"});

      // });

      // })
    }

    if (originalData.status == "ongoing" && originalData.status != updatedData.status) {
      updateAstrologerCurrentStatus(updatedData.astrologerUid, true);
    }

    if (originalData.status == "Initiated" && updatedData.status == "accepted") {
      console.log("fcm_started");
      if (updatedData.subtype != "Right Now") {
        admin.firestore().collection('user').doc(updatedData.userUid).get().then((userRef) => {

          userData = userRef.data();
          console.log("fcm_accepted");
          fcm_notification("token", userData.tokens[userData.tokens.length - 1], "Meeting accepted", "Your request for meeting is accepted", { "type": "meetingAccepted" });

        });
      }
      if (updatedData.subtype == "Scheduled") {
        admin.firestore().collection('astrologer').doc(updatedData.astrologerUid).collection("slot").doc(updatedData.day).collection("day_slot").doc(updatedData.slotId).update({ "status": "booked" });
      }

    }

    if (originalData.status == "ongoing" && updatedData.status == "refunded") {
      amount = ((updatedData.lastDuration - updatedData.lastActualDuration) / updatedData.lastDuration) * updatedData.lastAmountDeduct;
      amount = amount.toFixed(2);
      status1 = db.collection('user').doc(updatedData.userUid).update({ "walletBalance": admin.firestore.FieldValue.increment(+amount) });
      status2 = db.collection('user').doc(updatedData.userUid).collection("wallet_transaction").add({ "subtypeId": context.params.meetingId, "amount": +amount, "type": "credit", "subtype": "meeting", "date": admin.firestore.FieldValue.serverTimestamp() });
      db.collection('meetings').doc(context.params.meetingId).update({ "totalAmount": admin.firestore.FieldValue.increment(-amount) });

      updateAstrologerBalance(updatedData.astrologerUid, updatedData.totalAmount - amount, context.params.meetingId, "meeting");
      updateMeetingMetrics(updatedData.astrologerUid, updatedData.userUid, updatedData.totalDuration, updatedData.type);

    }

    if (originalData.status == "ongoing" && updatedData.status == "completed") {
      if (updatedData.userCount < 2) {
        console.log("meeting missed");
        admin.firestore().collection('meetings').doc(context.params.meetingId).update({ "status": "missed" });
      }
      else {
        updateAstrologerBalance(updatedData.astrologerUid, updatedData.totalAmount, context.params.meetingId, "meeting");
        updateMeetingMetrics(updatedData.astrologerUid, updatedData.userUid, updatedData.totalDuration, updatedData.type);
        admin.firestore().collection('user').doc(updatedData.userUid).update({ "meetingCount": admin.firestore.FieldValue.increment(1) });
        admin.firestore().collection('astrologer').doc(updatedData.astrologerUid).update({ "meetingCount": admin.firestore.FieldValue.increment(1) });
        admin.firestore().collection('app_details').doc('astrologerDetails').update({ "totalMeetings": admin.firestore.FieldValue.increment(1) });
      }
    }

    if ((originalData.status == "accepted" || originalData.status == "ongoing") && updatedData.status == "cancelled") {
      amount = updatedData.totalAmount;
      status1 = db.collection('user').doc(updatedData.userUid).update({ "walletBalance": admin.firestore.FieldValue.increment(amount) });
      status2 = db.collection('user').doc(updatedData.userUid).collection("wallet_transaction").add({ "subtypeId": context.params.meetingId, "amount": +amount, "type": "credit", "subtype": "meeting", "date": admin.firestore.FieldValue.serverTimestamp() });
      db.collection('meetings').doc(context.params.meetingId).update({ "totalAmount": admin.firestore.FieldValue.increment(-amount) });
    }

    if (originalData.status == "completed" && updatedData.status == "missed") {
      amount = updatedData.totalAmount;
      status1 = db.collection('user').doc(updatedData.userUid).update({ "walletBalance": admin.firestore.FieldValue.increment(amount) });
      status2 = db.collection('user').doc(updatedData.userUid).collection("wallet_transaction").add({ "subtypeId": context.params.meetingId, "amount": +amount, "type": "credit", "subtype": "meeting", "date": admin.firestore.FieldValue.serverTimestamp() });
      db.collection('meetings').doc(context.params.meetingId).update({ "totalAmount": admin.firestore.FieldValue.increment(-amount) });

      admin.firestore().collection('user').doc(updatedData.userUid).get().then((userRef) => {
        userData = userRef.data();
        console.log("fcm_accepted");
        fcm_notification("token", userData.tokens[userData.tokens.length - 1], "Meeting Missed", "You missed the meeting", { "type": "meetingMissed" });

      });
    }



    if (originalData.rate != updatedData.rate) {
      admin.firestore().collection('user').doc(updatedData.userUid).get().then((userRef) => {
        userData = userRef.data();
        db.collection('astrologer').doc(updatedData.astrologerUid).collection('astrologer_reviews').add({ "description": updatedData.rateMessage, "rating": updatedData.rate, "user": { "name": userData.firstName, "profilePhoto": userData.profilePhotoLink, "uuid": updatedData.userUid }, "date": admin.firestore.FieldValue.serverTimestamp() });
      });
    }
  });


exports.sendBroadcastNotification = functions.firestore.document('/broadcasts/{documentId}')
  .onUpdate(async (change, context) => {
    // Grab the current value of what was written to Firestore.

    const originalData = change.before.data();
    const updatedData = change.after.data();

    if (originalData.status != updatedData.status && updatedData.status == "live") {

      fcm_notification("topic", context.params.documentId, "Broadcast Started", "Please join the broadcast", { "type": "broadcast" });

    }

  });

exports.makeMeeting = functions.firestore.document('/meetings/{meetingId}')
  .onCreate(async (snap, context) => {
    // Grab the current value of what was written to Firestore.
    const original = snap.data();

    admin.firestore().collection('astrologer').doc(original['astrologerUid']).get().then((userRef) => {

      astrologerData = userRef.data();
      admin.firestore().collection('meetings').doc(context.params.meetingId).update({ "astrologerName": astrologerData.firstName, "astrologerImage": astrologerData.profilePicLink });

      fcm_notification("token", astrologerData.tokens[astrologerData.tokens.length - 1], "Meeting Request", "You have a request for meeting", { "type": "meetingCreated" });


    });

    admin.firestore().collection('user').doc(original['userUid']).get().then((userRef) => {

      userData = userRef.data();
      admin.firestore().collection('meetings').doc(context.params.meetingId).update({ "userName": userData.firstName, "userImage": userData.profilePhotoLink });

    });

    return;
  });

exports.makeAdmin = functions.firestore.document('/admins/{documentId}')
  .onCreate(async (snap, context) => {
    // Grab the current value of what was written to Firestore.
    const original = snap.data();

    functions.logger.log(original);


    const writeResult = await admin.firestore().collection('security_groups').doc('admin').collection('admin').doc(context.params.documentId).set({ "name": original });
    const ref = await admin.firestore().collection('app_details').doc("adminDetails").update({ "adminCount": admin.firestore.FieldValue.increment(1) });

    return writeResult;
  });

function saveEmailInSendgrid(name, email, listId) {
  const data = {
    "list_ids": [listId],
    "contacts": [
      {
        "email": email,
        "first_name": name
      }
    ]
  };

  const request = {
    url: `/v3/marketing/contacts`,
    method: 'PUT',
    body: data
  }

  sgClient.request(request)
    .then(([response, body]) => {
      console.log(response.statusCode);
      console.log(response.body['body']);
    })
    .catch(error => {
      console.error(error['response']['body']);
    });

}


exports.makeAstrologer = functions.firestore.document('/astrologer/{astrologerId}')
  .onCreate(async (snap, context) => {
    // Grab the current value of what was written to Firestore.
    const original = snap.data();

    functions.logger.log(original);

    // const writeResult = await admin.firestore().collection('security_groups').doc('astrologer').collection('astrologer').doc(context.params.astrologerId).set({"name": original});
    const ref = await admin.firestore().collection('app_details').doc("astrologerDetails").update({ "astrologerCount": admin.firestore.FieldValue.increment(1) });

    admin.firestore().collection('app_details').doc("astrologerDetails").collection("pricing_categories").doc(original['pricingCategory']).get().then((priceRef) => {
      priceData = priceRef.data();
      admin.firestore().collection('astrologer').doc(context.params.astrologerId).update({ "priceChat": priceData.priceChat, "priceVoice": priceData.priceVoice, "priceVideo": priceData.priceVideo, "currentDiscount": priceData.currentDiscount });
    });

    // const msg = {
    //   from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
    //   to: original['email'],
    //   templateId: "d-68b0e46471734ae9b5f6ffbd00a981a0",
    //   dynamic_template_data: {
    //         name: original['firstName'],
    //   },
    // };

    // sgMail.send(msg);

    // saveEmailInSendgrid(original['firstName'],original['email'],"79b82482-54aa-4f8f-9007-2d566c4dc7d6");

    return writeResult1;

  });

exports.makeuser = functions.firestore.document('/user/{documentId}')
  .onCreate(async (snap, context) => {
    // Grab the current value of what was written to Firestore.
    const original = snap.data();

    functions.logger.log(original);


    const writeResult = await admin.firestore().collection('security_groups').doc('user').collection('user').doc(context.params.documentId).set({ "name": original });
    const ref = admin.firestore().collection('app_details').doc("userDetails");
    await ref.update({ "userCount": admin.firestore.FieldValue.increment(1) });

    admin.firestore().collection("app_details").doc("userDetails").get().then((detailRef) => {
      detailData = detailRef.data();
      admin.firestore().collection("user").doc(context.params.documentId).update({ "counter": detailData.userCount });

    });

    const msg = {
      from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
      to: original['email'],
      templateId: "d-953328393c3a42f6a3c46e084786fb27",
      dynamic_template_data: {
        name: original['firstName'],
      },
    };

    sgMail.send(msg);

    saveEmailInSendgrid(original['firstName'], original['email'], "ab542a3d-01f2-4f29-b259-036cac1af3e5");

    return writeResult;

  });


exports.createComment = functions.firestore.document('/blog/{blogId}/comment/{commentId}')
  .onCreate(async (snap, context) => {
    // Grab the current value of what was written to Firestore.
    const original = snap.data();

    functions.logger.log(original);


    const ref = await admin.firestore().collection('blog').doc(context.params.blogId).update({ "commentCount": admin.firestore.FieldValue.increment(1) });

    return true;
  });


exports.deleteComment = functions.firestore.document('/blog/{blogId}/comment/{commentId}')
  .onDelete(async (snap, context) => {
    // Grab the current value of what was written to Firestore.
    const original = snap.data();

    functions.logger.log(original);


    const ref = await admin.firestore().collection('blog').doc(context.params.blogId).update({ "commentCount": admin.firestore.FieldValue.increment(-1) });


    return true;
  });


exports.updateUser = functions.firestore.document('/user/{userId}')
  .onUpdate(async (change, context) => {
    // Grab the current value of what was written to Firestore.
    const originalData = change.before.data();
    const updatedData = change.after.data();

    if (originalData.email != updatedData.email) {
      saveEmailInSendgrid(originalData.name, originalData.email, "ab542a3d-01f2-4f29-b259-036cac1af3e5")
    }


    return true;

  });

exports.updateRating = functions.firestore.document('/astrologer/{astrologerId}/astrologer_reviews/{reviewId}')
  .onCreate(async (snap, context) => {
    // Grab the current value of what was written to Firestore.
    const original = snap.data();

    functions.logger.log(original);

    const astrologerRef = await admin.firestore().collection('astrologer').doc(context.params.astrologerId);

    admin.firestore().runTransaction((transaction) => {
      return transaction.get(astrologerRef).then((res) => {

        if (!res.exists) {
          throw "Document does not exist!";
        }

        var newRatingCount = res.data().ratingCount + 1;

        var oldRating = res.data().rating * res.data().ratingCount;
        var newRating = (oldRating + original['rating']) / newRatingCount;

        functions.logger.log(oldRating);
        functions.logger.log(newRating);

        transaction.update(astrologerRef, {
          "ratingCount": newRatingCount,
          "rating": newRating.toFixed(2)
        });

      });


    });


    return true;
  });

exports.addUserInSecurityGroup = functions.firestore.document('/security_groups/user/user/{userId}')
  .onCreate(async (snap, context) => {

    admin.firestore().collection("user").doc(context.params.userId).update({ "enabled": true });

    return true;
  });

exports.addAstrologerInSecurityGroup = functions.firestore.document('/security_groups/astrologer/astrologer/{userId}')
  .onCreate(async (snap, context) => {

    admin.firestore().collection("astrologer").doc(context.params.astrologerId).update({ "enabled": true });

    return true;
  });

exports.addAdminInSecurityGroup = functions.firestore.document('/security_groups/admin/admin/{adminId}')
  .onCreate(async (snap, context) => {

    admin.firestore().collection("admin").doc(context.params.adminId).update({ "enabled": true });

    return true;
  });

exports.removeUserInSecurityGroup = functions.firestore.document('/security_groups/user/user/{userId}')
  .onDelete(async (snap, context) => {

    admin.firestore().collection("user").doc(context.params.userId).update({ "enabled": false });

    return true;
  });

exports.removeAstrologerInSecurityGroup = functions.firestore.document('/security_groups/astrologer/astrologer/{userId}')
  .onDelete(async (snap, context) => {

    admin.firestore().collection("astrologer").doc(context.params.astrologerId).update({ "enabled": false });

    return true;
  });

exports.removeAdminInSecurityGroup = functions.firestore.document('/security_groups/admin/admin/{adminId}')
  .onDelete(async (snap, context) => {

    admin.firestore().collection("admin").doc(context.params.adminId).update({ "enabled": false });

    return true;
  });

// exports.createWithdrawal = functions.firestore.document('/astrologer/{paymentId}') 
// .onCreate(async (snap, context) => { 

//   try{
//       instance.transfers.create({
//           "accountID":"acc_IDuK8WVcCd6hZg",
//           "amount": 500,
//           "currency": "INR"
//         }).then(async (err,response) => {

//         if(err) throw err;
//         functions.logger.log(response);

//         });
//       }
//       catch(e) {
//         functions.logger.log(e);
//       }
//   } 

// );

exports.addInterested = functions.firestore.document('/broadcasts/{broadcastId}/interested/{interestedId}')
  .onCreate(async (snap, context) => {

    const writeResult = await admin.firestore().collection('broadcasts').doc(context.params.broadcastId).update({ "interestedCount": admin.firestore.FieldValue.increment(1) });

    return true;
  });

exports.deleteInterested = functions.firestore.document('/broadcasts/{broadcastId}/interested/{interestedId}')
  .onDelete(async (snap, context) => {

    const writeResult = await admin.firestore().collection('broadcasts').doc(context.params.broadcastId).update({ "interestedCount": admin.firestore.FieldValue.increment(-1) });

    return true;
  });


exports.createInventory = functions.firestore.document('/items/{itemId}')
  .onCreate(async (snap, context) => {

    const writeResult = await admin.firestore().collection('items').doc(context.params.itemId).collection("inventory").add({ "quantity": 0 });

    return true;
  });


exports.updateInventory = functions.firestore.document('/items/{itemId}/inventory/{inventoryId}')
  .onCreate(async (original, context) => {
    // Grab the current value of what was written to Firestore.

    const ref = await admin.firestore().collection('item').doc(context.params.itemId).update({ "available": admin.firestore.FieldValue.increment(original.data().qty) });

    return true;

  });

exports.walletWithdrawal = functions.firestore.document('/wallet_withdrawal/{withdrawalId}')
  .onCreate(async (snap, context) => {
    const original = snap.data();

    updateAstrologerBalance2(original.astrologer, -original.amount, context.params.withdrawalId, "withdrawal");

    return true;

  });


exports.updateAstrologer = functions.firestore.document('/astrologer/{astrologerId}')
  .onUpdate(async (change, context) => {
    // Grab the current value of what was written to Firestore.
    const originalData = change.before.data();
    const updatedData = change.after.data();

    if (originalData.pricingCategory != updatedData.pricingCategory) {

      admin.firestore().collection('app_details').doc("astrologerDetails").collection("pricing_categories").doc(updatedData.pricingCategory).get().then((priceRef) => {
        priceData = priceRef.data();
        admin.firestore().collection('astrologer').doc(context.params.astrologerId).update({ "priceChat": priceData.priceChat, "priceVoice": priceData.priceVoice, "priceVideo": priceData.priceVideo, "currentDiscount": priceData.currentDiscount });
      });

    };

    if (originalData.status['state'] != updatedData.status['state'] && updatedData.status['state'] == "verified") {

      const msg = {
        from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
        to: updatedData.email,
        templateId: "d-1a49291b91ec4729aef74e5a410a3db4",
        dynamic_template_data: {
          subject: 'Your astrology request accepted',
          name: updatedData.firstName,
        },
      };

      sgMail.send(msg);

    }
    else if (originalData.status['state'] != updatedData.status['state'] && updatedData.status['state'] == "rejected") {
      const msg = {
        from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
        to: updatedData.email,
        templateId: "d-a685246e05224cacace136476f4caf87",
        dynamic_template_data: {
          subject: 'Your astrology request rejected',
          name: updatedData.firstName,
        },
      };

      sgMail.send(msg);
    }

    if (originalData.email != updatedData.email) {
      saveEmailInSendgrid(originalData.name, originalData.email, "79b82482-54aa-4f8f-9007-2d566c4dc7d6")
    }

    return true;

  });

exports.updateWalletWithdrawal = functions.firestore.document('/wallet_withdrawal/{withdrawalId}')
  .onUpdate(async (change, context) => {

    const originalData = change.before.data();
    const updatedData = change.after.data();


    if (originalData.status != updatedData.status) {

      if (updatedData.status == "approved") {
        try {
          if (updatedData.transactionId != null & updatedData.transactionId != "") {
            amount = updatedData.amount - updatedData.approvedAmount;
            admin.firestore().collection("wallet_withdrawal").doc(context.params.withdrawalId).update({ "status": "completed" });
            updateAstrologerBalance2(updatedData.astrologer, amount, context.params.withdrawalId, "withdrawal");
          }
          else {
            admin.firestore().collection("wallet_withdrawal").doc(context.params.withdrawalId).update({ "status": "failed" });
            updateAstrologerBalance2(updatedData.astrologer, updatedData.amount, context.params.withdrawalId, "withdrawal");
          }
        }
        catch (e) {
          admin.firestore().collection("wallet_withdrawal").doc(context.params.withdrawalId).update({ "status": "failed" });
          updateAstrologerBalance2(updatedData.astrologer, updatedData.amount, context.params.withdrawalId, "withdrawal");
        }

        admin.firestore().collection("astrologer").doc(updatedData.astrologer).get().then((astrologerRef) => {
          data = astrologerRef.data();
          const msg = {
            from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
            to: data['email'],
            templateId: "d-68b0e46471734ae9b5f6ffbd00a981a0",
            dynamic_template_data: {
              subject: 'Welcome to my awesome app!',
              name: "user.displayName",
            },
          };

          sgMail.send(msg);
        });

      }
      else if (updatedData.status == "rejected") {
        updateAstrologerBalance2(updatedData.astrologer, updatedData.amount, context.params.withdrawalId, "withdrawal");
        admin.firestore().collection("astrologer").doc(updatedData.astrologer).get().then((astrologerRef) => {
          data = astrologerRef.data();
          const msg = {
            from: 'astrochrchatech@gmail.com', // Something like: Jane Doe <janedoe@gmail.com>
            to: data['email'],
            templateId: "d-ff3a63f4a47f4a2aa4c38824db49ca54",
            dynamic_template_data: {
              subject: 'Welcome to my awesome app!',
              name: "user.displayName",
            },
          };

          sgMail.send(msg);
        });
      }

    };

    return true;

  });

exports.updatePricingCategory = functions.firestore.document('/app_details/astrologerDetails/pricing_categories/{pricingCategory}')
  .onUpdate(async (change, context) => {

    const updatedData = change.after.data();
    const _datarwt = [];

    admin.firestore().collection('astrologer').get().then((astrologerSnap) => {
      astrologerSnap.docs.map((doc) => {
        console.log(doc.ref.id);
        admin.firestore().collection('astrologer').doc(doc.ref.id).get().then((astrologerRef) => {
          astrologerData = astrologerRef.data();
          if (astrologerData.pricingCategory == context.params.pricingCategory) {
            _datarwt.push(admin.firestore().collection('astrologer').doc(doc.ref.id).update({ "priceChat": updatedData.priceChat, "priceVoice": updatedData.priceVoice, "priceVideo": updatedData.priceVideo }));
          }
        });
      });

    });

    const _dataloaded = await Promise.all(_datarwt);

    return _dataloaded;

  });


return exports.scheduledFunctionCrontab = functions.pubsub.schedule('00 00 * * *')
  .timeZone('Asia/Kolkata') // Users can choose timezone - default is America/Los_Angeles
  .onRun(async (context) => {

    const _datarwt = [];

    //   admin.firestore().collection('astrologer').get().then((astrologerSnap) => {
    //     astrologerDocs = astrologerSnap.docs;
    //     const currentDate = admin.firestore.Timestamp.now();
    //     const previousDate = new admin.firestore.Timestamp(
    //     currentDate.seconds - 86400,
    //     currentDate.nanoseconds).toDate();
    //     var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    //     var dayName = days[previousDate.getDay()];
    //     astrologerDocs.map((doc)=> {
    //       admin.firestore().collection('astrologer').doc(doc.ref.id).collection('slot').doc(dayName).collection("day_slot").get().then((slotSnap) => {
    //         slotDocs = slotSnap.docs;
    //         slotDocs.map((slotDoc) => {
    //               admin.firestore().collection('astrologer').doc(doc.ref.id).collection('slot').doc(dayName).collection("day_slot").doc(slotDoc.ref.id).get().then((slotRef) => {
    //                 slotData = slotRef.data();
    //                 if(slotData.type == "norepeat")
    //                 {
    //                   _datarwt.push( admin.firestore().collection('astrologer').doc(doc.ref.id).collection('slot').doc(dayName).collection("day_slot").doc(slotDoc.ref.id).delete());
    //                 }
    //                 else
    //                 {
    //                   const todayDate = admin.firestore.Timestamp.now();
    //                   const nextWeekDate = new admin.firestore.Timestamp(
    //                       todayDate.seconds + 518400 , todayDate.nanoseconds);
    //                       _datarwt.push( admin.firestore().collection('astrologer').doc(doc.ref.id).collection('slot').doc(dayName).collection("day_slot").doc(slotDoc.ref.id).update({"status": "available", "date": nextWeekDate }));
    //                 }
    //               });
    //           });
    //     });
    //   });
    // });


    const currentDate = admin.firestore.Timestamp.now();
    const startDate = new admin.firestore.Timestamp(
      currentDate.seconds - 176400,
      currentDate.nanoseconds).toDate();
    const endDate = new admin.firestore.Timestamp(
      currentDate.seconds - 86400,
      currentDate.nanoseconds).toDate();

    console.log(startDate);
    console.log(endDate);

    admin.firestore().collection('meetings').where("scheduledTime", ">=", startDate).where("scheduledTime", "<=", endDate).get().then((meetingSnap) => {
      docs = meetingSnap.docs;
      docs.map((doc) => {
        console.log(doc.ref.id);
        admin.firestore().collection('meetings').doc(doc.ref.id).get().then((meetingRef) => {
          meetingData = meetingRef.data();
          if (meetingData.status == "Initiated") {
            _datarwt.push(admin.firestore().collection('meetings').doc(doc.ref.id).update({ "status": "rejected" }));
          }
          else if (meetingData.status == "accepted") {
            _datarwt.push(admin.firestore().collection('meetings').doc(doc.ref.id).update({ "status": "refunded" }));
          }
          else if (meetingData.status == "ongoing") {
            _datarwt.push(admin.firestore().collection('meetings').doc(doc.ref.id).update({ "status": "completed" }));
          }
        });
      });
    });

    admin.firestore().collection('broadcasts').where("scheduledTime", ">=", startDate).where("scheduledTime", "<=", endDate).get().then((broadcastSnap) => {
      docs = broadcastSnap.docs;
      docs.map((doc) => {
        console.log(doc.ref.id);
        admin.firestore().collection('broadcasts').doc(doc.ref.id).get().then((broadcastRef) => {
          broadcastData = broadcastRef.data();
          if (broadcastData.status == "scheduled") {
            _datarwt.push(admin.firestore().collection('broadcasts').doc(doc.ref.id).update({ "status": "cancelled" }));
          }
        });
      });
    });

    const _dataloaded = await Promise.all(_datarwt);

    return _dataloaded;
  });

