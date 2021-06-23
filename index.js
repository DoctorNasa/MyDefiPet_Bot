const TelegramBot = require("node-telegram-bot-api");
const Web3 = require("web3");
const CoinGecko = require("coingecko-api");
const { RateLimiter } = require("limiter");
const axios = require("axios");
const abi = require("./abi.js");

require("dotenv").config();

const mdpContractAddress = "0xea2e87ff1bc1E52b640452694E2F143F7f8D64bE";
const dpetAontractAddress = "0xfb62ae373aca027177d1c18ee0862817f9080d08";
const bsc = "https://bsc-dataseed.binance.org/";

const web3 = new Web3(bsc);
const contract_instance = new web3.eth.Contract(abi, mdpContractAddress);
const CoinGeckoClient = new CoinGecko();
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const limiter = new RateLimiter({
  tokensPerInterval: 5,
  interval: "sec",
  fireImmediately: true,
});

bot.onText(/\/mdp (.+)\s(.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1].toLowerCase();
  const query = match[2];
  console.log("match ==>> ", keyword, query, msg);
  switch (keyword) {
    case "pet_id":
      contract_instance.methods
        .getPet(query)
        .call()
        .then((data) =>
          bot.sendMessage(
            chatId,
            `<code>birth time: ${data.birthTime}\nstages: ${data.stages}\ngeneration: ${data.generation}\nsire id: ${data.sireId}\nmatron id: ${data.matronId}\nsiring with id: ${data.siringWithId}\nis gestating: ${data.isGestating}\nis ready: ${data.isReady}\ncooldown index: ${data.cooldownIndex}\nnext action at: ${data.nextActionAt}\ngenes: ${data.genes}</code>`,
            {
              parse_mode: "HTML",
            }
          )
        )
        .catch((err) => console.log("err ==>> ", err));
      break;
    default:
      break;
  }
});

bot.onText(/\/mdp (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1].toLowerCase();
  switch (keyword) {
    case "total_supply":
      contract_instance.methods
        .totalSupply()
        .call()
        .then((data) =>
          bot.sendMessage(chatId, `<code>${data || 0}</code>`, {
            parse_mode: "HTML",
          })
        )
        .catch((err) => console.log("err ==>> ", err));
      break;

    case "contract_address":
      bot
        .sendMessage(chatId, `<code>${mdpContractAddress}</code>`, {
          parse_mode: "HTML",
        })
        .catch((err) => console.log("err ==>> ", err));
      break;

    default:
      break;
  }
});

bot.onText(/\/dpet (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1].toLowerCase() || null;
  console.log("dpet match ==>> ", keyword);
  switch (keyword) {
    case "info":
      CoinGeckoClient.coins
        .fetchCoinContractInfo(dpetAontractAddress)
        .then((data) => {
          console.log("data ==>> ", data);
          bot.sendMessage(chatId, `<code>${data.data.description.en}</code>`, {
            parse_mode: "HTML",
          });
        })
        .catch((err) => console.log("err ==>> ", err));
      break;

    case "price":
      CoinGeckoClient.simple
        .fetchTokenPrice({
          contract_addresses: dpetAontractAddress,
          vs_currencies: "usd",
        })
        .then((data) => {
          bot.sendMessage(
            chatId,
            `<code>$${data.data[dpetAontractAddress].usd || 0}</code>`,
            {
              parse_mode: "HTML",
            }
          );
        })
        .catch((err) => console.log("err ==>> ", err));
      break;

    case "contract_address":
      CoinGeckoClient.coins
        .fetchCoinContractInfo(dpetAontractAddress)
        .then((data) => {
          bot.sendMessage(
            chatId,
            `<code>${data.data.contract_address}</code>`,
            {
              parse_mode: "HTML",
            }
          );
        })
        .catch((err) => console.log("err ==>> ", err));
      break;

    case "stats":
      CoinGeckoClient.coins
        .fetchCoinContractInfo(dpetAontractAddress)
        .then((data) => {
          console.log("data ==>> ", data.data.market_data.price_change_);
          bot.sendMessage(
            chatId,
            `<code>current price: $${
              data.data.market_data.current_price.usd
            }\nmarket cap: $${
              data.data.market_data.market_cap.usd
            }\ntotal volume: $${
              data.data.market_data.total_volume.usd
            }\nprice change (24h): $${
              data.data.market_data.price_change_24h_in_currency.usd
            }\nprice change % (24h): ${
              data.data.market_data.price_change_percentage_24h_in_currency.usd
            }\nmarket cap change (24h): $${
              data.data.market_data.market_cap_change_24h_in_currency.usd
            }\nmarket cap % change (24h): ${
              data.data.market_data.market_cap_change_percentage_24h_in_currency
                .usd
            }\ntotal supply: ${
              data.data.market_data.total_supply
            }\ncirculating supply: ${data.data.market_data.circulating_supply.toFixed(
              4
            )}</code>`,
            {
              parse_mode: "HTML",
            }
          );
        })
        .catch((err) => console.log("err ==>> ", err));
      break;

    default:
      //   bot.sendMessage(chatId, "<code>Error: Invalid command</code>", {
      //     parse_mode: "HTML",
      //   });
      break;
  }
});

// bot.on("message", (msg) => {
//   const chatId = msg.chat.id;
//   bot.sendMessage(chatId, "Received your message!!");
// });

bot.onText(/\/bsc (.+)\s(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1].toLowerCase();
  const query = match[2];
  switch (keyword) {
    case "tx_status":
      const remainingRequests = await limiter.removeTokens(1);
      let response;

      if (remainingRequests < 0) {
        bot.sendMessage(
          chatId,
          `<code>error: too many requests, try later</code>`,
          {
            parse_mode: "HTML",
          }
        );
        break;
      } else {
        response = await axios.get(
          `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${query}&apikey=${process.env.BSC_API_KEY}`
        );
        let responseText =
          response.data.result.status === "1" ? "success" : "fail";

        if (response.data.result.status === "0") {
          responseText = "fail";
        } else if (response.data.result.status === "1") {
          responseText = "success";
        } else {
          bot.sendMessage(chatId, `<code>error: invalid hash</code>`, {
            parse_mode: "HTML",
          });
          break;
        }
        bot.sendMessage(chatId, `<code>status: ${responseText}</code>`, {
          parse_mode: "HTML",
        });
      }
      console.log("data from axios ==>> ", response);
      break;
    default:
      break;
  }
});

bot.onText(/\/bot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1].toLowerCase();
  switch (keyword) {
    case "author":
      bot.sendMessage(
        chatId,
        `<a href="tg://user?id=897862335">@anik_ghosh</a>`,
        {
          parse_mode: "HTML",
        }
      );
      break;
    case "source_code":
      bot.sendMessage(
        chatId,
        `<a href="https://github.com/anik-ghosh-au7/MyDefiPet_Bot">https://github.com/anik-ghosh-au7/MyDefiPet_Bot</a>`,
        {
          parse_mode: "HTML",
        }
      );
      break;
    case "donations":
      bot.sendMessage(
        chatId,
        `<code>bsc_wallet_address:
        \n0x0DdE395D980ab9f05B80580eDb8781455d41a218
        \n\ntop doners:
        \n1. xxxxxxxxxx 0.00
        \n2. xxxxxxxxxx 0.00
        \n3. xxxxxxxxxx 0.00
        </code>`,
        {
          parse_mode: "HTML",
        }
      );
      break;
    default:
      break;
  }
});
