import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';
import { HashHersions } from './base/base_hash_versions';

require('dotenv').config();

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;

  //TODO: change it for different chains deployment!
  const owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
  const ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
  // const owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
  // const ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';

  // TODO: change it for stable coin address
  const tokenRootAddress = new Address('0:4ead8fa1a11d62cc0e73f6d0ecb7cdb23db1d61f21cb78901035357765e0fad0');
  const decimals = 9;

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

  let chainIds = [locklift.utils.getRandomNonce().toFixed(), locklift.utils.getRandomNonce().toFixed()];
  // chainIds = [ '58978', '26396' ];
  console.log(chainIds);
  let translatorAddress1, translatorAddress2;
  // translatorAddress1 = new Address("0:1107560de4d1856b4b5ee627df95b44a8caae4643f4d1b77abf22666aef9c624");
  // translatorAddress2 = new Address("0:fe54dd858b69be3c86d235366788c5c0f33314f35880fd39d3762045f1a9571b");
  if (!translatorAddress1) {
    const { contract: translatorObj1 } = await locklift.factory.deployContract({
      contract: "AsterizmTranslator",
      publicKey: signer.publicKey,
      initParams: { owner_: owner, localChainId_: chainIds[0], localChainType_: ChainTypes.TVM, nonce_: locklift.utils.getRandomNonce().toFixed() },
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
      initParams: {  owner_: owner, localChainId_: chainIds[1], localChainType_: ChainTypes.TVM, nonce_: locklift.utils.getRandomNonce().toFixed() },
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
  // initializerAddress1 = new Address("0:acf94f35190a6f6a76bc1de5bcc6a172f39bad563bcd183fb995c09e1eaa4c0a");
  // initializerAddress2 = new Address("0:36be6e4b2f64e9f3a0828fd65bfddb5a0449d5b309786ac65e8ab582e1bf63e5");
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

  const { contract: gas1 } = await locklift.factory.deployContract({
    contract: "GasStation",
    publicKey: signer.publicKey,
    initParams: {
      owner_: owner,
      initializerLib_: initializer1.address,
      useForceOrder_: false,
      disableHashValidation_: false,
      nonce_: locklift.utils.getRandomNonce().toFixed(),
      hashVersion_: HashHersions.CrosschainV1,
    },
    constructorParams: {},
    value: locklift.utils.toNano(2),
  });
  console.log(`Gas1 deployed at: ${gas1.address.toString()}`);
  const demoObj1 = new bigInt(gas1.address.toString().substring(2), 16);

  const { contract: gas2 } = await locklift.factory.deployContract({
    contract: "GasStation",
    publicKey: signer.publicKey,
    initParams: {
      owner_: owner,
      initializerLib_: initializer2.address,
      useForceOrder_: false,
      disableHashValidation_: false,
      nonce_: locklift.utils.getRandomNonce().toFixed(),
      hashVersion_: HashHersions.CrosschainV1,
    },
    constructorParams: {},
    value: locklift.utils.toNano(2),
  });
  console.log(`Gas2 deployed at: ${gas2.address.toString()}`);
  const demoObj2 = new bigInt(gas2.address.toString().substring(2), 16);

  const tracing1 = await locklift.tracing.trace(
    gas1.methods.addTrustedAddresses({
      _chainIds: chainIds,
      _trustedAddresses: [demoObj1.toString(), demoObj2.toString()]
    }).send({
      from: ownerWallet.address,
      amount: locklift.utils.toNano(1)
    })
  );

  const tracing2 = await locklift.tracing.trace(
    gas2.methods.addTrustedAddresses({
      _chainIds: chainIds,
      _trustedAddresses: [demoObj1.toString(), demoObj2.toString()]
    }).send({
      from: ownerWallet.address,
      amount: locklift.utils.toNano(1)
    })
  );

  await gas1.methods.addStableCoin({
    _tokenRoot: tokenRootAddress,
    _decimals: decimals
}).send({
    from: ownerWallet.address,
    amount: locklift.utils.toNano(1)
});

await gas2.methods.addStableCoin({
  _tokenRoot: tokenRootAddress,
  _decimals: decimals
}).send({
  from: ownerWallet.address,
  amount: locklift.utils.toNano(1)
});

}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
