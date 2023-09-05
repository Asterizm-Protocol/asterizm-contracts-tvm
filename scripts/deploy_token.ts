import {Address, WalletTypes, zeroAddress} from "locklift";
import BigNumber from "bignumber.js";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
import { NetworkTypes } from './base/base_network_types';
import { parseArgs } from './base/base_parce_args';

async function main() {
  const commandArgs = parseArgs(process.argv.slice(5));
  const network = commandArgs.network;
  const decimals = commandArgs.decimals ? commandArgs.decimals : 9;

  const signer = (await locklift.keystore.getSigner("0"))!;

  let owner;
  let ownerPubkey;
  if (network == NetworkTypes.localhost) {
      owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
      ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
  } else if (network == NetworkTypes.testnet) {
      owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
      ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
  } else if (network == NetworkTypes.testnetVenom) {
      owner = new Address(process.env.TESTNET_VENOM_OWNER_ADDRESS || '');
      ownerPubkey = process.env.TESTNET_VENOM_OWNER_KEY || '';
  } else {
    owner = new Address(process.env.MAINNET_EVER_OWNER_ADDRESS || '');
    ownerPubkey = process.env.MAINNET_EVER_OWNER_KEY || '';
  }
  
    const ownerWallet = await locklift.factory.accounts.addExistingAccount({
      address: owner,
      type: WalletTypes.MsigAccount,
      mSigType: "multisig2",
    });
    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //   address: owner,
    //   type: WalletTypes.EverWallet,
    // });
    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //   publicKey: ownerPubkey,
    //   type: WalletTypes.WalletV3,
    // });

    const TokenWallet = locklift.factory.getContractArtifacts("AsterizmTestTokenWallet");


    let tokenRootContract;
    let tokenRootAddress;
    // tokenRootAddress = new Address("0:e5adba28e71d4dbf8463cbab336447c6e0c9accf56b90cf3afc8f0c5a2292c1e");

    if (tokenRootAddress) {
      tokenRootContract = locklift.factory.getDeployedContract("AsterizmTestTokenRoot", tokenRootAddress);
    } else {
      let { contract: tokenRootContract } = await locklift.factory.deployContract({
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

      tokenRootAddress = tokenRootContract.address;
    }

    const tokenRoot = tokenRootContract ? tokenRootContract : locklift.factory.getDeployedContract("AsterizmTestTokenRoot", tokenRootAddress);

    console.log(`Token root deployed at: ${tokenRoot.address.toString()}`);

    const tracing = await locklift.tracing.trace(tokenRoot.methods.mint({
        amount: 100000000 * (10 ** decimals),
        recipient: ownerWallet.address,
        deployWalletValue: locklift.utils.toNano(0.1), // 0.1 ever
        remainingGasTo: ownerWallet.address,
        notify: false,
        payload: "",
      }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
      }));
    // await tokenRoot.methods.mint({
    //   amount: 100000000000 * (10 ** decimals),
    //   recipient: ownerWallet.address,
    //   deployWalletValue: locklift.utils.toNano(0.1), // 0.1 ever
    //   remainingGasTo: ownerWallet.address,
    //   notify: false,
    //   payload: "",
    // }).send({
    //   from: ownerWallet.address,
    //   amount: locklift.utils.toNano(1)
    // });
    
    
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
