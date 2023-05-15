import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");

require('dotenv').config();

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;

  //TODO: change it for different chains deployment!
  const owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS); // EverWallet
  const ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY;

  const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    address: owner,
    type: WalletTypes.EverWallet,
  });
  // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
  //   publicKey: ownerPubkey,
  //   type: WalletTypes.WalletV3,
  // });

  const localChainIds = [locklift.utils.getRandomNonce().toFixed(), locklift.utils.getRandomNonce().toFixed()];
  console.log(localChainIds);
  let translatorAddress1, translatorAddress2;
  // translatorAddress1 = new Address("0:5c3374b7f0ea1b44c45a049bf95bbb01ff6c33b67911919e2fd2abeec7c200ce");
  // translatorAddress2 = new Address("0:5c3374b7f0ea1b44c45a049bf95bbb01ff6c33b67911919e2fd2abeec7c200ce");
  if (!translatorAddress1) {
    const { contract: translatorObj1 } = await locklift.factory.deployContract({
      contract: "AsterizmTranslator",
      publicKey: signer.publicKey,
      initParams: { owner_: owner, localChainId_: localChainIds[0] },
      constructorParams: {},
      value: locklift.utils.toNano(1.5),
    });
    translatorAddress1 = translatorObj1.address;
    console.log(`Translator1 deployed at: ${translatorAddress1.toString()}`);
    
    let tracing = await locklift.tracing.trace(
      translatorObj1.methods.addChains({
        _chainIds: localChainIds,
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
      initParams: {  owner_: owner, localChainId_: localChainIds[1] },
      constructorParams: {},
      value: locklift.utils.toNano(1.5),
    });
    translatorAddress2 = translatorObj2.address;
    console.log(`Translator2 deployed at: ${translatorAddress2.toString()}`);
    
    let tracing = await locklift.tracing.trace(
      translatorObj2.methods.addChains({
        _chainIds: localChainIds,
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
  // initializerAddress1 = new Address("0:6517864315004e78a5e69f0be2fe6185bdd044751b82e38757d96cba108eb168");
  // initializerAddress2 = new Address("0:6517864315004e78a5e69f0be2fe6185bdd044751b82e38757d96cba108eb168");
  if (!initializerAddress1) {
    const { contract: initializer1 } = await locklift.factory.deployContract({
      contract: "AsterizmInitializer",
      publicKey: signer.publicKey,
      initParams: {
        owner_: owner,
        translatorLib_: translatorAddress1,
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
        translatorLib_: translatorAddress2,
        initializerTransferCode_: AsterizmInitializerTransfer.code,
        clientTransferCode_: AsterizmClientTransfer.code,
        nonceCode_: AsterizmNonce.code,
      },
      constructorParams: {},
      value: locklift.utils.toNano(1.5),
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

  // const { contract: gas } = await locklift.factory.deployContract({
  //   contract: "GasStation",
  //   publicKey: signer.publicKey,
  //   initParams: { owner_: owner, },
  //   constructorParams: { _initializerLib: initializerAddress, },
  //   value: locklift.utils.toNano(2),
  // });
  // console.log(`Gas deployed at: ${gas.address.toString()}`);

  const { contract: demo1 } = await locklift.factory.deployContract({
    contract: "AsterizmDemo",
    publicKey: signer.publicKey,
    initParams: {
      owner_: owner,
      initializerLib_: initializerAddress1,
      useForceOrder_: true,
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
      initializerLib_: initializerAddress2,
      useForceOrder_: true,
      disableHashValidation_: false,
    },
    constructorParams: {},
    value: locklift.utils.toNano(2),
  });
  console.log(`Demo2 deployed at: ${demo2.address.toString()}`);
  const demoObj2 = new bigInt(demo2.address.toString().substring(2), 16);

  const tracing1 = await locklift.tracing.trace(
    demo1.methods.addTrustedSourceAddresses({
      _chainIds: localChainIds,
      _trustedAddresses: [demoObj1.toString(), demoObj2.toString()]
    }).send({
      from: ownerWallet.address,
      amount: locklift.utils.toNano(0.2)
    })
  );

  const tracing2 = await locklift.tracing.trace(
    demo2.methods.addTrustedSourceAddresses({
      _chainIds: localChainIds,
      _trustedAddresses: [demoObj1.toString(), demoObj2.toString()]
    }).send({
      from: ownerWallet.address,
      amount: locklift.utils.toNano(0.2)
    })
  );

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
