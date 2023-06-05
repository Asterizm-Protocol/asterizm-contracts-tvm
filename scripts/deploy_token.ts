import {Address, WalletTypes, zeroAddress} from "locklift";
import BigNumber from "bignumber.js";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";

async function main() {
    const signer = (await locklift.keystore.getSigner("0"))!;
  
    //TODO: change it for different chains deployment!
    const owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
    const ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
    // const owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
    // const ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
  
    const ownerWallet = await locklift.factory.accounts.addExistingAccount({
      address: owner,
      type: WalletTypes.MsigAccount,
      mSigType: "multisig2",
    });

    const TokenWallet = locklift.factory.getContractArtifacts("AsterizmTestTokenWallet");

    const decimals = 9;

    const { contract: tokenRoot } = await locklift.factory.deployContract({
        contract: "AsterizmTestTokenRoot",
        publicKey: signer.publicKey,
        initParams: {
            randomNonce_: locklift.utils.getRandomNonce(),
            rootOwner_: ownerWallet.address,
            name_: "AsterizmTestToken",
            symbol_: "ATT",
            deployer_: zeroAddress,
            decimals_: decimals,
            walletCode_: TokenWallet.code
        },
        constructorParams: {
            initialSupplyTo: zeroAddress,
            initialSupply: new BigNumber('0').shiftedBy(decimals).toFixed(),
            deployWalletValue: new BigNumber('0').toFixed(),
            mintDisabled: false,
            burnByRootDisabled: false,
            burnPaused: false,
            remainingGasTo: ownerWallet.address,
        },
        value: locklift.utils.toNano(2),
    });

    console.log(`Token root deployed at: ${tokenRoot.address.toString()}`);

    const tracing = await locklift.tracing.trace(tokenRoot.methods.mint({
        amount: 1000000 * (10 ** decimals), //10 tokens * 9 decimals
        recipient: ownerWallet.address,
        deployWalletValue: locklift.utils.toNano(0.1), // 0.1 ever
        remainingGasTo: ownerWallet.address,
        notify: false,
        payload: "",
      }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
      }));
    
    
      const tokenWalletAddress = (await tokenRoot.methods.walletOf({answerId: 0, walletOwner: ownerWallet.address}).call()).value0;
      const tokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', tokenWalletAddress);
    
      const {value0: tokenWalletBalance} = await tokenWallet.methods.balance({ answerId: 0 }).call();
      const { value0: totalSupply } = await tokenRoot.methods.totalSupply({ answerId: 0 }).call();
    
      console.log(`Tokens minted to ${ownerWallet.address.toString()}, wallet balance is ${tokenWalletBalance}, total supply is ${totalSupply}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
      console.log(e);
      process.exit(1);
  });