import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';

require('dotenv').config();

async function main() {

    const isTestnet = true;

    const chains = isTestnet ? Chains.testnet : Chains.mainnet;

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



    let chainIds = [];
    let chainTypes = [];
    let trustedAddresses = [];
    let currentChain;
    for (let i = 0; i < chains.length; i++) {
        if (chains[i].isCurrent) {
            currentChain = chains[i];
        }

        chainIds.push(chains[i].id);
        chainTypes.push(chains[i].chainType);
        trustedAddresses.push(chains[i].trustAddresses.gas);
    }

    currentChain = currentChain ? currentChain : chains[0];
  
    let translatorAddress;
    // translatorAddress = new Address("0:520237b291e5af75605228ede9b9fb56ddcd30574251d27490ca0a0418bf5fab");
    if (!translatorAddress) {
      const { contract: translatorObj1 } = await locklift.factory.deployContract({
        contract: "AsterizmTranslator",
        publicKey: signer.publicKey,
        initParams: {
          owner_: owner,
          localChainId_: currentChain.id,
          localChainType_: ChainTypes.TVM,
          nonce_: locklift.utils.getRandomNonce().toFixed(),
        },
        constructorParams: {},
        value: locklift.utils.toNano(1.5),
      });
      translatorAddress = translatorObj1.address;
  
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
  
    const translator = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress);
  
  
    const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
    const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");
    const AsterizmNonce = locklift.factory.getContractArtifacts("AsterizmNonce");
  
    let initializerAddress;
    // initializerAddress = new Address("0:7dc4f2de520a9317aa4e24dcc08e18955d92765de70665dd0e1ca07935d2f5af");
    if (!initializerAddress) {
      const { contract: initializer1 } = await locklift.factory.deployContract({
        contract: "AsterizmInitializer",
        publicKey: signer.publicKey,
        initParams: {
          owner_: owner,
          translatorLib_: translator.address,
          initializerTransferCode_: AsterizmInitializerTransfer.code,
          clientTransferCode_: AsterizmClientTransfer.code,
          nonceCode_: AsterizmNonce.code,
        },
        constructorParams: {},
        value: locklift.utils.toNano(1.5),
      });
      initializerAddress = initializer1.address;
  
        const tracing = await locklift.tracing.trace(
            translator.methods.setInitializer({
            _initializerReceiver: initializer1.address,
          }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
          })
        );
    }


    const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress);

    // TODO: change it for stable coin address
    const tokenRootAddress = new Address('0:4ead8fa1a11d62cc0e73f6d0ecb7cdb23db1d61f21cb78901035357765e0fad0');
    const decimals = 9;


    console.log(`TestToken (ATT) deployed at: ${tokenRootAddress.toString()}`);
    console.log(`Translator deployed at: ${translatorAddress.toString()}`);
    console.log(`Initializer deployed at: ${initializerAddress.toString()}`);



    const { contract: gas } = await locklift.factory.deployContract({
        contract: "GasStation",
        publicKey: signer.publicKey,
        initParams: {
            owner_: owner,
            initializerLib_: initializer.address,
            useForceOrder_: true,
            disableHashValidation_: false,
            nonce_: locklift.utils.getRandomNonce().toFixed(),
        },
        constructorParams: {},
        value: locklift.utils.toNano(2),
    });
    console.log(`GasSender deployed at: ${gas.address.toString()}`);

    const gasAddressUint = new bigInt(gas.address.toString().substring(2), 16);


    for (let i = 0; i < chainIds.length; i++) {
        if (chainIds[i] == currentChain.id) {
            trustedAddresses[i] = gasAddressUint.value.toString();
            break;
        }
    }

    let tracing;
    tracing = await locklift.tracing.trace(
        gas.methods.addTrustedAddresses({
            _chainIds: chainIds,
            _trustedAddresses: trustedAddresses
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );

    tracing = await locklift.tracing.trace(
        gas.methods.addStableCoin({
            _tokenRoot: tokenRootAddress,
            _decimals: decimals
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );

    tracing = await locklift.tracing.trace(
        gas.methods.buildGasPayload({
            _chainIds: [currentChain.id],
            _amounts: ['10000000000'],
            _receivers: [gasAddressUint.toString()],
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
