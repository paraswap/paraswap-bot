require("dotenv").config();
const Web3 = require("web3");
const BN = require("bigNumber.js");
const HDWalletProvider = require("truffle-hdwallet-provider");
const {ParaSwap} = require("paraswap");

const PROVIDER_URL = process.env.PROVIDER_URL;
const TEST_PK = process.env.TEST_PK;
const TEST_USER_ADDRESS = process.env.TEST_USER_ADDRESS;
const TEST_REFERRER = process.env.TEST_REFERRER;

class ParaSwapper {

    constructor(){
        this.web3Provider = new Web3(PROVIDER_URL);

        this.paraSwap = new ParaSwap();
    }

    async getTokens(){
        return this.paraSwap.getTokens();
    }

    async getRate(from, to, amount){
        return this.paraSwap.getRate(from.address, to.address, amount);
    }

    async buildSwap(from, to, srcAmount, minAmount, priceRoute) {
        return this.paraSwap.buildTx(from.address, to.address, srcAmount, minAmount, priceRoute, TEST_USER_ADDRESS, TEST_REFERRER);
    }

    async swap(txParams){
        try {
            const provider = new Web3(new HDWalletProvider(TEST_PK, PROVIDER_URL));

            const result = await provider.eth.sendTransaction(txParams, async (err, transactionHash) => {
              if (err) {
                return console.error('Tx_Error', txParams.from, err);
              }
              console.log(txParams.from, `https://etherscan.io/tx/${transactionHash}`)
            });

            console.log('result', result);

          } catch (e) {
            console.error('Tx_Error', txParams.from, e);
          }
    }

    amountOf(amount, token){
        return new BN(amount).times(10 ** token.decimals).toFixed(0);
    }

    rateOf(amount, token){
        return new BN(amount).dividedBy(10 ** token.decimals).toFixed(9);
    }

    display(_amount, from, to, priceRoute) {
        return `rate of ${_amount} ${from.symbol} = ${this.rateOf(priceRoute.amount, to)} ${to.symbol}`;
    }
}

async function swap(_amount, _from, _to, execute) {
    const ps = new ParaSwapper();

    const tokens = await ps.getTokens();

    const from = tokens.find(({symbol}) => symbol === _from);

    const to = tokens.find(({symbol}) => symbol === _to);

    const amount = ps.amountOf(_amount, from);

    const priceRoute = await ps.getRate(from, to, amount);

    console.log("swap", ps.display(_amount, from, to, priceRoute));

    const minAmount = new BN(priceRoute.amount).times(0.995).toFixed(0);

    const transaction = await ps.buildSwap(from, to, amount, minAmount, priceRoute);

    console.log(transaction);

    if(execute) ps.swap(transaction);
}

async function multiSwap(_amount, _tokens, execute) {
    const ps = new ParaSwapper();

    const tokens = await ps.getTokens();

    const from = tokens.find(({symbol}) => symbol === _tokens[0]);

    const to = tokens.find(({symbol}) => symbol === _tokens[3]);

    const amount = ps.amountOf(_amount, from);

    const priceRoute = await ps.paraSwap.getRateByRoute(_tokens, amount);

    console.log("multiSwqap", ps.display(_amount, from, to, priceRoute));

    if(new BN(priceRoute.amount).isLessThanOrEqualTo(amount)){
        return console.log("No profit :(");
    }

    const minAmount = new BN(priceRoute.amount).times(0.995).toFixed(0);

    const transaction = await ps.buildSwap(from, to, amount, minAmount, priceRoute);

    console.log(transaction);

    if(execute) ps.swap(transaction);
}

multiSwap(0.05, ["ETH", "DAI", "USDC", "ETH"], true);

swap(0.05, "ETH", "DAI", true);
