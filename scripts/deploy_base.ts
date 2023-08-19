import {Address, WalletTypes} from "locklift";
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';

require('dotenv').config();

async function main() {

  const isTestnet = true;

  const chains = isTestnet ? Chains.testnet : Chains.mainnet;

  const signer = (await locklift.keystore.getSigner("0"))!;

  //TODO: change it for different chains deployment!
  // const owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
  // const ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
  // const owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
  // const ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
  const owner = new Address(process.env.TESTNET_VENOM_OWNER_ADDRESS || '');
  const ownerPubkey = process.env.TESTNET_VENOM_OWNER_KEY || '';

  const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    address: owner,
    type: WalletTypes.MsigAccount,
    mSigType: "multisig2",
  });




  let chainIds = [];
  let chainTypes = [];
  let currentChain;
  for (let i = 0; i < chains.length; i++) {
      if (chains[i].isCurrent) {
          currentChain = chains[i];
      }

      chainIds.push(chains[i].id);
      chainTypes.push(chains[i].chainType);
  }

  let translatorAddress1;
  // translatorAddress1 = new Address("0:520237b291e5af75605228ede9b9fb56ddcd30574251d27490ca0a0418bf5fab");
  if (!translatorAddress1) {
    const { contract: translatorObj1 } = await locklift.factory.deployContract({
      contract: "AsterizmTranslator",
      publicKey: signer.publicKey,
      initParams: {
        owner_: owner,
        localChainId_: currentChain ? currentChain.id : chainIds[0],
        localChainType_: ChainTypes.TVM,
        nonce_: locklift.utils.getRandomNonce().toFixed(),
      },
      constructorParams: {},
      value: locklift.utils.toNano(1.5),
    });
    translatorAddress1 = translatorObj1.address;
    console.log(`Translator deployed at: ${translatorAddress1.toString()}`);

    let tracing = await locklift.tracing.trace(
      translatorObj1.methods.addChains({
        _chainIds: chainIds,
        _chainTypes: chainTypes,
      }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
      })
    );
  }

  const translator1 = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress1);


  const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
  const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");
  const AsterizmNonce = locklift.factory.getContractArtifacts("AsterizmNonce");

  let initializerAddress1;
  // initializerAddress1 = new Address("0:7dc4f2de520a9317aa4e24dcc08e18955d92765de70665dd0e1ca07935d2f5af");
  if (!initializerAddress1) {
    const { contract: initializer1 } = await locklift.factory.deployContract({
      contract: "AsterizmInitializer",
      publicKey: signer.publicKey,
      initParams: {
        owner_: owner,
        translatorLib_: translator1.address,
        initializerTransferCode_: AsterizmInitializerTransfer.code,
        clientTransferCode_: AsterizmClientTransfer.code,
        nonceCode_: AsterizmNonce.code,
      },
      constructorParams: {},
      value: locklift.utils.toNano(1.5),
    });
    initializerAddress1 = initializer1.address;
    console.log(`Initializer deployed at: ${initializerAddress1.toString()}`);

      const tracing = await locklift.tracing.trace(
        translator1.methods.setInitializer({
          _initializerReceiver: initializer1.address,
        }).send({
          from: ownerWallet.address,
          amount: locklift.utils.toNano(1)
        })
      );
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
