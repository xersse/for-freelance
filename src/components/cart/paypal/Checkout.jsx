import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { PaymentForm } from "./PaymentForm";
import { useState, useEffect } from "react";

const Checkout = () => {
  const [clientToken, setClientToken] = useState(null);

  const initialOptions = {
    "client-id": "AQmNbPW2JN4VzyUTuwTZhRraiF3_9X1HQRM0N0sMvrcHKFV9iCo-KoaShJpAPIgT_nvZ4pRKtyLHUAkr",
    "data-client-token": clientToken,
    components: "hosted-fields,buttons",
    "enable-funding": "paylater,venmo",
    "disable-funding": "venmo",
    "data-sdk-integration-source": "integrationbuilder_ac",
  };

  useEffect(() => {
    (async () => {
      const response = await fetch("http://localhost:3000/api/token", {
        method: "POST",
      });
      const { client_token } = await response.json();
      setClientToken(client_token);
    })();
  }, []);
  return (
    <>
      {clientToken ? (
        <PayPalScriptProvider options={initialOptions}>
          <PaymentForm />
        </PayPalScriptProvider>
      ) : (
        <h1 className="check">Checkout</h1>
        // <PayPalCheckoutButton />
      )}
    </>
  );
};

export default Checkout;
