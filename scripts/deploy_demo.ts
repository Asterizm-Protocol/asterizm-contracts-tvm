import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';

require('dotenv').config();

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;

  //TODO: change it for different chains deployment!
  const owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
  const ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
  // const owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
  // const ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';

  // TODO: change it for stable coin address
  const tokenRootAddress = '0:4ead8fa1a11d62cc0e73f6d0ecb7cdb23db1d61f21cb78901035357765e0fad0';

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

  const chainIds = [locklift.utils.getRandomNonce().toFixed(), locklift.utils.getRandomNonce().toFixed()];
  console.log(chainIds);
  let translatorAddress1, translatorAddress2;
  // translatorAddress1 = new Address("0:520237b291e5af75605228ede9b9fb56ddcd30574251d27490ca0a0418bf5fab");
  // translatorAddress2 = new Address("0:14e197ff4f5243603ba435ca06edcf06790ac6c1cdd7e2d1a98c3d4ac682eabc");
  if (!translatorAddress1) {
    const { contract: translatorObj1 } = await locklift.factory.deployContract({
      contract: "AsterizmTranslator",
      publicKey: signer.publicKey,
      initParams: { owner_: owner, localChainId_: chainIds[0], localChainType_: ChainTypes.TVM },
      constructorParams: {},
      value: locklift.utils.toNano(1.5),
    });
    translatorAddress1 = translatorObj1.address;
    console.log(`Translator1 deployed at: ${translatorAddress1.toString()}`);
    
    let tracing = await locklift.tracing.trace(
      translatorObj1.methods.addChains({
        _chainIds: chainIds,
        _chainTypes: [ChainTypes.TVM, ChainTypes.TVM],
      }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
      })
    );
  }

  if (!translatorAddress2) {
    const { contract: translatorObj2 } = await locklift.factory.deployContract({
      contract: "AsterizmTranslator",
      publicKey: signer.publicKey,
      initParams: {  owner_: owner, localChainId_: chainIds[1], localChainType_: ChainTypes.TVM },
      constructorParams: {},
      value: locklift.utils.toNano(1.5),
    });
    translatorAddress2 = translatorObj2.address;
    console.log(`Translator2 deployed at: ${translatorAddress2.toString()}`);
    
    let tracing = await locklift.tracing.trace(
      translatorObj2.methods.addChains({
        _chainIds: chainIds,
        _chainTypes: [ChainTypes.TVM, ChainTypes.TVM],
      }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
      })
    );
  }

  const translator1 = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress1);
  const translator2 = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress2);


  const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
  const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");
  const AsterizmNonce = locklift.factory.getContractArtifacts("AsterizmNonce");

  let initializerAddress1, initializerAddress2;
  // initializerAddress1 = new Address("0:7dc4f2de520a9317aa4e24dcc08e18955d92765de70665dd0e1ca07935d2f5af");
  // initializerAddress2 = new Address("0:e3b7d199fd7cf64ffc604ae47ff63b07d0f07413d86ad68049e1f7d79dd51b56");
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
    console.log(`Initializer1 deployed at: ${initializerAddress1.toString()}`);

      const tracing = await locklift.tracing.trace(
        translator1.methods.setInitializer({
          _initializerReceiver: initializer1.address,
        }).send({
          from: ownerWallet.address,
          amount: locklift.utils.toNano(1)
        })
      );
  }
  if (!initializerAddress2) {
    const { contract: initializer2 } = await locklift.factory.deployContract({
      contract: "AsterizmInitializer",
      publicKey: signer.publicKey,
      initParams: {
        owner_: owner,
        translatorLib_: translator2.address,
        initializerTransferCode_: AsterizmInitializerTransfer.code,
        clientTransferCode_: AsterizmClientTransfer.code,
        nonceCode_: AsterizmNonce.code,
      },
      constructorParams: {},
      value: locklift.utils.toNano(2),
    });
    initializerAddress2 = initializer2.address;
    console.log(`Initializer2 deployed at: ${initializerAddress2.toString()}`);

      const tracing = await locklift.tracing.trace(
        translator2.methods.setInitializer({
          _initializerReceiver: initializer2.address,
        }).send({
          from: ownerWallet.address,
          amount: locklift.utils.toNano(1)
        })
      );
  }
  const initializer1 = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress1);
  const initializer2 = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress2);

  const { contract: demo1 } = await locklift.factory.deployContract({
    contract: "AsterizmDemo",
    publicKey: signer.publicKey,
    initParams: {
      owner_: owner,
      initializerLib_: initializer1.address,
      useForceOrder_: false,
      disableHashValidation_: false,
    },
    constructorParams: {},
    value: locklift.utils.toNano(2),
  });
  console.log(`Demo1 deployed at: ${demo1.address.toString()}`);
  const demoObj1 = new bigInt(demo1.address.toString().substring(2), 16);

  const { contract: demo2 } = await locklift.factory.deployContract({
    contract: "AsterizmDemo",
    publicKey: signer.publicKey,
    initParams: {
      owner_: owner,
      initializerLib_: initializer2.address,
      useForceOrder_: false,
      disableHashValidation_: false,
    },
    constructorParams: {},
    value: locklift.utils.toNano(2),
  });
  console.log(`Demo2 deployed at: ${demo2.address.toString()}`);
  const demoObj2 = new bigInt(demo2.address.toString().substring(2), 16);

  const tracing1 = await locklift.tracing.trace(
    demo1.methods.addTrustedAddresses({
      _chainIds: chainIds,
      _trustedAddresses: [demoObj1.toString(), demoObj2.toString()]
    }).send({
      from: ownerWallet.address,
      amount: locklift.utils.toNano(1)
    })
  );

  const tracing2 = await locklift.tracing.trace(
    demo2.methods.addTrustedAddresses({
      _chainIds: chainIds,
      _trustedAddresses: [demoObj1.toString(), demoObj2.toString()]
    }).send({
      from: ownerWallet.address,
      amount: locklift.utils.toNano(1)
    })
  );

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
