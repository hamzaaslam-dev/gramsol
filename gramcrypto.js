const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input"); // npm install input
const axios = require("axios");
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot("7357121965:AAHA1gWw2kFyL5xtxb7v-smUHq9ivt8BkkM", {
  polling: false,
});
const logChatId = ; // Replace with your Telegram chat ID

// Function to send messages to Telegram
function sendMessageToTelegram(message) {
  bot.sendMessage(logChatId, message).catch(console.error);
}
const {
  Connection,
  Keypair,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  SendTransactionError,
} = require("@solana/web3.js");
const bs58 = require("bs58");

const timedelay = 5;
const apiId = ;
const apiHash = "";
const stringSession = new StringSession(
  ""
);
const targetChannelId = -1002232016830; // Replace with your target channel/group ID
const purchaseAmount = 0.08;
const minmarketcap = 10000;
const targetPercentage = 50.0; // Target price change percentage
const maxTimeLimit = 1000000; // Maximum time limit in milliseconds (e.g., 30 minutes)
const interval = 1000; // Interval between checks in milliseconds (e.g., 5 seconds)

const solanaAddressRegex = /[A-HJ-NP-Za-km-z1-9]{32,44}/g;
const keypair = Keypair.fromSecretKey(
  bs58.default.decode(
    ""
  )
);
const connection = new Connection("https://api.mainnet-beta.solana.com");

async function performSwap(fromToken, toToken, amount, retryCount = 0) {
  const maxRetries = 3; // Set the maximum number of retries
  const params = new URLSearchParams({
    from: fromToken,
    to: toToken,
    amount: amount,
    slip: 99,
    payer: keypair.publicKey.toBase58(),
    fee: 0.0009,
    txType: "v0",
  });

  try {
    const response = await axios.get(
      `https://swap.solxtence.com/swap?${params}`
    );
    console.log("Response from swap service:", response.data);
    const { serializedTx, txType } = response.data.transaction;

    let transaction;
    const { blockhash } = await connection.getLatestBlockhash(); // Fetch latest blockhash
    if (txType === "v0") {
      transaction = VersionedTransaction.deserialize(
        Buffer.from(serializedTx, "base64")
      );
      transaction.message.recentBlockhash = blockhash;
      transaction.sign([keypair]);
    } else {
      transaction = Transaction.from(Buffer.from(serializedTx, "base64"));
      transaction.recentBlockhash = blockhash;
      transaction.sign(keypair);
    }

    const signature = await sendAndConfirmTransaction(connection, transaction, {
      commitment: "confirmed",
      timeout: 120000,
    });
    console.log("Swap successful! Transaction signature:", signature);
    sendMessageToTelegram(
      `Swap successful! Transaction signature: ${signature}`
    );
    console.log("Transaction URL:", `https://solscan.io/tx/${signature}`);
    sendMessageToTelegram(
      `Transaction URL: https://solscan.io/tx/${signature}`
    );

    return { signature, swapDetails: response.data.swapDetails };
  } catch (error) {
    if (error instanceof SendTransactionError) {
      const logs = await error.getLogs();
      console.log("Send Transaction Error Logs:", logs);
      sendMessageToTelegram(
        `Send Transaction Error Logs: ${logs}\nError performing swap: ${error}`
      );
      if (error.transactionMessage.includes("Blockhash not found")) {
        if (retryCount < maxRetries) {
          console.log(
            `Retrying transaction due to blockhash not found... Attempt ${
              retryCount + 1
            }`
          );
          //delay 10 seconds
          await new Promise((resolve) => setTimeout(resolve, 5000));
          return await performSwap(fromToken, toToken, amount); // Retry the swap
        } else {
          console.log("Max retries reached. Aborting transaction.");
          sendMessageToTelegram("Max retries reached. Aborting transaction.");
          sendMessageToTelegram(`https://pump.fun/${fromToken}`);
        }
      }
    }
    console.error("Error performing swap:", error);
    sendMessageToTelegram(`Error performing swap: ${error}`);
    return null;
  }
}
async function trackcoin(tokenAddress) {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );

    console.log("Response from dexscreener:", response.data);

    return { details: response.data.pairs };
  } catch (error) {
    console.error("Error tracking marketcap:", error);
    return null;
  }
}
async function trackprice(fromToken, toToken, amount) {
  const params = new URLSearchParams({
    from: fromToken,
    to: toToken,
    amount: amount,
    slip: 25,
  });

  try {
    const response = await axios.get(
      `https://swap.solxtence.com/quote?${params}`
    );

    console.log("Response from swap service:", response.data);

    return { trackDetails: response.data.swapDetails };
  } catch (error) {
    console.error("Error tracking price:", error);
    return null;
  }
}
async function getBalance(tokenAddress) {
  try {
    // Make a POST request to Solana's RPC API with the correct JSON-RPC payload
    const response = await axios.post(`https://api.mainnet-beta.solana.com`, {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        keypair.publicKey.toBase58(), // Owner's public key
        { mint: tokenAddress }, // Token mint address
        { encoding: "jsonParsed" }, // Requesting the response in parsed JSON format
      ],
    });

    // Check if we got a valid response
    if (
      response.data &&
      response.data.result &&
      response.data.result.value.length > 0
    ) {
      const accountInfo =
        response.data.result.value[0].account.data.parsed.info;
      const tokenBalance = accountInfo.tokenAmount.uiAmount; // Balance in a user-friendly format

      console.log(`Token balance for ${tokenAddress}: ${tokenBalance}`);
      return tokenBalance;
    } else {
      console.log(`No token accounts found for ${tokenAddress}`);
      return 0; // Return 0 if no balance is found
    }
  } catch (error) {
    console.error("Error fetching token balance:", error);
    sendMessageToTelegram(`Error fetching token balance: ${error}`);
    return 0; // Return 0 in case of error
  }
}

(async () => {
  try {
    console.log("Loading interactive example...");
    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () =>
        await input.text("Please enter your phone number: "),
      password: async () => await input.text("Please enter your password: "),
      phoneCode: async () =>
        await input.text("Please enter the code you received: "),
      onError: (err) => console.log("Error during authentication:", err),
    });

    console.log("You are now connected.");
    console.log("Session string:", client.session.save());

    // //const channel = await client.getEntity(targetChannelId);
    // //console.log(
    //   `Listening for messages from ${channel.title}(ID: ${targetChannelId})`
    // );
    client.addEventHandler(async (event) => {
      const message = event.message;

      const chatId =
        message.peerId?.channelId || message.peerId?.chatId || message.chatId;

      if (chatId == targetChannelId) {
        console.log(`New message from target channel: ${message.text}`);
        sendMessageToTelegram(
          `New message from target channel: ${message.text}`
        );

        const addresses = message.text.match(solanaAddressRegex);
        if (addresses && addresses.length > 0) {
          const firstAddress = addresses[0]; // Get the first detected address
          console.log(`Detected Solana address: ${firstAddress}`);

          const resp = await trackcoin(firstAddress);
          const { details } = resp;

          //console.log(details[0]);
          const marketcap = details[0].marketCap;
          console.log(details[0]);
          //want to access url

          // const web_url = details[0].info.websites[0].url;
          // console.log(web_url);
          // if (web_url.includes("x.") || web_url.includes("t.")) {
          //   console.log("fake weblink");
          //   const isreal = false;
          // } else {
          //   console.log("real weblink");
          //   sendMessageToTelegram(`Real weblink: ${web_url}`);
          //   const isreal = true;
          // }
          // console.log(`Market Cap: ${marketcap}`);

          if (marketcap >= minmarketcap) {
            // Perform the token buy swap
            console.log("Performing token buy...");
            const res = await performSwap(
              "So11111111111111111111111111111111111111112",
              firstAddress,
              purchaseAmount
            );
            const { signature, swapDetails } = res;
            const boughtprice = swapDetails.priceData.spotPrice;
          } else {
            console.log(`Market cap is lower than ${minmarketcap}.`);
            sendMessageToTelegram(`Market cap is lower than ${minmarketcap}.`);
          }

          // Example swap SOL -> token
          console.log(`https://dexscreener.com/solana/${firstAddress}`);
          sendMessageToTelegram(
            `https://dexscreener.com/solana/${firstAddress}`
          );
          // Wait for some time (e.g., 10 seconds) before selling
          console.log(`Waiting ${timedelay} seconds before selling...`);
          sendMessageToTelegram(
            `Waiting ${timedelay} seconds before selling...`
          );
          await new Promise((resolve) => setTimeout(resolve, timedelay * 1000));

          //Fetch the balance of the bought tokens
          const tokenBalance = await getBalance(firstAddress);
          console.log(`Token balance for ${firstAddress}: ${tokenBalance}`);
          sendMessageToTelegram(
            `Token balance for ${firstAddress}: ${tokenBalance}`
          );

          if (tokenBalance > 0) {
            const startTime = Date.now();

            while (true) {
              const res = await trackprice(
                firstAddress,
                "So11111111111111111111111111111111111111112",
                tokenBalance
              );
              console.log(res);
              const { trackDetails } = res;
              console.log(trackDetails);
              const currentprofit = trackDetails.outputAmount - purchaseAmount;
              console.log(`outputAmount: ${trackDetails.outputAmount}`);
              console.log(`purchaseAmount: ${purchaseAmount}`);
              console.log(`Current profit: ${currentprofit}`);
              //const changepercentage = currentprofit / purchaseAmount;

              const pricechangepercentage = (
                (currentprofit / purchaseAmount) *
                100
              ).toFixed(2);

              console.log(`Price Change Percentage: ${pricechangepercentage}%`);

              if (pricechangepercentage >= targetPercentage) {
                console.log("Target price change percentage reached.");
                console.log(
                  `Performing token sell on this percentage: ${pricechangepercentage}%`
                );
                sendMessageToTelegram(
                  `Performing token sell on this percentage: ${pricechangepercentage}%`
                );
                break;
              }

              if (Date.now() - startTime > maxTimeLimit) {
                console.log("Time limit exceeded. Selling the token.");
                // Perform the sell operation here
                break;
              }

              await new Promise((resolve) => setTimeout(resolve, interval));
            }

            // Perform the token sell swap (selling all the tokens)
            console.log("Performing token sell...");
            const response = await performSwap(
              firstAddress,
              "So11111111111111111111111111111111111111112",
              tokenBalance
            ); // Swap all tokens -> SOL

            const { signature, swapDetails } = response;

            console.log(purchaseAmount);
            console.log(swapDetails.outputAmount);

            const profit = (swapDetails.outputAmount - purchaseAmount).toFixed(
              8
            );

            const profitpercentage = ((profit / purchaseAmount) * 100).toFixed(
              2
            );
            console.log(`Profit: ${profit}`);
            console.log(`Profit percentage: ${profitpercentage}%`);
            sendMessageToTelegram(
              `Profit: ${profit}\nProfit percentage: ${profitpercentage}%`
            );
          } else {
            console.log(`No tokens to sell for ${firstAddress}.`);
          }
        } else {
          console.log("No Solana addresses found in the message.");
          sendMessageToTelegram("No Solana addresses found in message");
        }
      } else {
        console.log(`Message from other chat (ID: ${chatId})`);
      }
    }, new NewMessage({ chats: [targetChannelId] }));

    console.log("Listening for messages...");
    sendMessageToTelegram("Bot is now running...");
  } catch (error) {
    console.error("An error occurred:", error.message);
    sendMessageToTelegram(`An error occurred: ${error.message}`);
  }
})();
