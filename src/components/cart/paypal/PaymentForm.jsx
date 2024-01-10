import { useState, useRef, useEffect } from "react";
import styles from "./PaymentForm.module.css";

import {
  PayPalHostedFieldsProvider,
  PayPalHostedField,
  PayPalButtons,
  usePayPalHostedFields,
} from "@paypal/react-paypal-js";
import Header from "../../header";

export const PaymentForm = () => {
  const [cart, setCart] = useState([]);
  const [discountedPrice, setDiscountedPrice] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const promo = localStorage.getItem("promo");

  // Récupérer le panier depuis le local storage
  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
    setCart(savedCart);
  }, []);

  // Calculer le prix total de tous les articles dans le panier
  useEffect(() => {
    const newTotalPrice = cart.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
    const roundedTotalPrice =
      Math.round(newTotalPrice * 100 + Number.EPSILON) / 100;
    setTotalPrice(roundedTotalPrice.toFixed(2));
  }, [cart]);

  // Calculer le prix total avec la réduction
  useEffect(() => {
    if (promo) {
      const discountedPrice = totalPrice - totalPrice * (promo * 0.01);
      const roundedDiscountedPrice =
        Math.round(discountedPrice * 100 + Number.EPSILON) / 100;
      setDiscountedPrice(roundedDiscountedPrice.toFixed(2));
    }
  }, [totalPrice, promo]);
  async function createOrderCallback() {
    try {
      const response = await fetch("http://localhost:3000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // use the "body" param to optionally pass additional order information
        // like product ids and quantities
        body: JSON.stringify({
          cart: [
            {
              id: "YOUR_PRODUCT_ID",
              quantity: "YOUR_PRODUCT_QUANTITY",
              cost: totalPrice,
            },
          ],
        }),
      });

      const orderData = await response.json();

      if (orderData.id) {
        return orderData.id;
      } else {
        const errorDetail = orderData?.details?.[0];
        const errorMessage = errorDetail
          ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
          : JSON.stringify(orderData);

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      return `Could not initiate PayPal Checkout...${error}`;
    }
  }

  async function onApproveCallback(data, actions) {
    try {
      const response = await fetch(
        `http://localhost:3000/api/orders/${data.orderID}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const orderData = await response.json();
      // Three cases to handle:
      //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
      //   (2) Other non-recoverable errors -> Show a failure message
      //   (3) Successful transaction -> Show confirmation or thank you message

      const transaction =
        orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
        orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
      const errorDetail = orderData?.details?.[0];

      // this actions.restart() behavior only applies to the Buttons component
      if (
        errorDetail?.issue === "INSTRUMENT_DECLINED" &&
        !data.card &&
        actions
      ) {
        // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
        return actions.restart();
      } else if (
        errorDetail ||
        !transaction ||
        transaction.status === "DECLINED"
      ) {
        // (2) Other non-recoverable errors -> Show a failure message
        let errorMessage;
        if (transaction) {
          errorMessage = `Transaction ${transaction.status}: ${transaction.id}`;
        } else if (errorDetail) {
          errorMessage = `${errorDetail.description} (${orderData.debug_id})`;
        } else {
          errorMessage = JSON.stringify(orderData);
        }

        throw new Error(errorMessage);
      } else {
        // (3) Successful transaction -> Show confirmation or thank you message
        // Or go to another URL:  actions.redirect('thank_you.html');

        console.log(
          "Capture result",
          orderData,
          JSON.stringify(orderData, null, 2)
        );
        return `Transaction ${transaction.status}: ${transaction.id}. See console for all available details`;
      }
    } catch (error) {
      return `Sorry, your transaction could not be processed...${error}`;
    }
  }

  const SubmitPayment = ({ onHandleMessage }) => {
    // Here declare the variable containing the hostedField instance
    const { cardFields } = usePayPalHostedFields();
    const cardHolderName = useRef(null);

    const submitHandler = () => {
      if (typeof cardFields.submit !== "function") return; // validate that \`submit()\` exists before using it
      //if (errorMsg) showErrorMsg(false);
      cardFields
        .submit({
          // The full name as shown in the card and billing addresss
          // These fields are optional for Sandbox but mandatory for production integration
          cardholderName: cardHolderName?.current?.value,
        })
        .then(async (data) => onHandleMessage(await onApproveCallback(data)))
        .catch((orderData) => {
          onHandleMessage(
            `Sorry, your transaction could not be processed...${JSON.stringify(
              orderData
            )}`
          );
        });
    };

    return (
      <button onClick={submitHandler} className="btn btn-pay btn-primary">
        Pay
      </button>
    );
  };

  const Message = ({ content }) => {
    return <p>{content}</p>;
  };
  const [message, setMessage] = useState("");
  // const savedCart = JSON.parse(localStorage.getItem("cart")) || [];
  // const totalPrice = savedCart.reduce((acc, item) => {
  //   const itemTotal = item.price * item.quantity;
  //   return acc + itemTotal;
  // }, 0);

  return (

<div className={styles.div}>
      <div className={styles.form}>
        <PayPalButtons
          style={{
            shape: "pill",
            //color:'blue' change the default color of the buttons

            layout: "vertical", //default value. Can be changed to horizontal
            color: "white",
          }}
          styles={{
            marginTop: "4px",
            marginBottom: "4px",
          }}
          createOrder={createOrderCallback}
          onApprove={async (data, actions) =>
            setMessage(await onApproveCallback(data, actions))
          }
        />
        <PayPalHostedFieldsProvider createOrder={createOrderCallback}>
          <div style={{ marginTop: "4px", marginBottom: "4px" }}>
            <PayPalHostedField
              id="card-number"
              hostedFieldType="number"
              options={{
                selector: "#card-number",
                placeholder: "Card Number",
              }}
              className={`${styles.input} ${styles.inp}`}
            />
            <div className={styles.container}>
              <PayPalHostedField
                id="expiration-date"
                hostedFieldType="expirationDate"
                options={{
                  selector: "#expiration-date",
                  placeholder: "Expiration Date",
                }}
                className={styles.input}
              />
              <PayPalHostedField
                id="cvv"
                hostedFieldType="cvv"
                options={{
                  selector: "#cvv",
                  placeholder: "CVV",
                }}
                className={styles.input}
              />
            </div>
            <div className={styles.container}>
              <input
                id="card-holder"
                type="text"
                placeholder="Name on Card"
                className={styles.input}
              />

              <input
                id="card-billing-address-country"
                type="text"
                placeholder="Country Code"
                className={styles.input}
              />
            </div>
            <SubmitPayment onHandleMessage={setMessage} />
          </div>
        </PayPalHostedFieldsProvider>
        <Message content={message} />
      </div>
    </div>
  );
};
