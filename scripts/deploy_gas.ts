import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';
import { NetworkTypes } from './base/base_network_types';
import { HashHersions } from './base/base_hash_versions';
import { parseArgs } from './base/base_parce_args';

require('dotenv').config();

async function main() {
    const commandArgs = parseArgs(process.argv.slice(5));

    const chains = commandArgs.network == NetworkTypes.localhost || commandArgs.network == NetworkTypes.testnet || commandArgs.network == NetworkTypes.testnetVenom ?
        Chains.testnet : Chains.mainnet;
    const signer = (await locklift.keystore.getSigner("0"))!;

    const decimals = 9;

    let owner;
    let ownerPubkey;
    let tokenRootAddress;
    if (commandArgs.network == NetworkTypes.localhost) {
        owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
        ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
        tokenRootAddress = new Address('0:4ead8fa1a11d62cc0e73f6d0ecb7cdb23db1d61f21cb78901035357765e0fad0');
    } else if (commandArgs.network == NetworkTypes.testnet) {
        owner = new Address(process.env.TESTNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_EVER_OWNER_KEY || '';
        tokenRootAddress = new Address('0:8c6dcaa30727458527e99a479dae92a92a51c24e235e5b531659e201204d79ee');
    } else if (commandArgs.network == NetworkTypes.testnetVenom) {
        owner = new Address(process.env.TESTNET_VENOM_OWNER_ADDRESS || '');
        ownerPubkey = process.env.TESTNET_VENOM_OWNER_KEY || '';
        tokenRootAddress = new Address('0:d5756401c0e2ad938bb980e72846f22f02b15d83c2c9190f93c0c2ff44771336');
    } else {
        owner = new Address(process.env.MAINNET_EVER_OWNER_ADDRESS || '');
        ownerPubkey = process.env.MAINNET_EVER_OWNER_KEY || '';
        tokenRootAddress = new Address('0:8c6dcaa30727458527e99a479dae92a92a51c24e235e5b531659e201204d79ee');
    }

    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //     address: owner,
    //     type: WalletTypes.MsigAccount,
    //     mSigType: "multisig2",
    // });
    // const ownerWallet = await locklift.factory.accounts.addExistingAccount({
    //     publicKey: ownerPubkey,
    //     type: WalletTypes.WalletV3,
    // });
    const ownerWallet = await locklift.factory.accounts.addExistingAccount({
      address: owner,
      type: WalletTypes.EverWallet,
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
    translatorAddress = new Address("0:29e584c3166ae61198623e35c48772300f7d983e85010449d216b222403e68bc");
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
  
    //   let tracing = await locklift.tracing.trace(
    //     translatorObj1.methods.addChains({
    //       _chainIds: chainIds,
    //       _chainTypes: chainTypes,
    //     }).send({
    //       from: ownerWallet.address,
    //       amount: locklift.utils.toNano(1)
    //     })
    //   );
        await translatorObj1.methods.addChains({
            _chainIds: chainIds,
            _chainTypes: chainTypes,
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        });
    }
  
    const translator = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress);
  
  
    const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
    const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");
    const AsterizmNonce = locklift.factory.getContractArtifacts("AsterizmNonce");
  
    let initializerAddress;
    initializerAddress = new Address("0:ded7d5c7decefe1324ac2eaa7d1bc84c552ac769499b3dbb7076ed957d5bba73");
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
  
    //   const tracing = await locklift.tracing.trace(
    //     translator.methods.setInitializer({
    //     _initializerReceiver: initializer1.address,
    //   }).send({
    //     from: ownerWallet.address,
    //     amount: locklift.utils.toNano(1)
    //   })
    // );
        await translator.methods.setInitializer({
            _initializerReceiver: initializer1.address,
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        });
    }


    const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress);


    console.log(`TestToken (ATT) deployed at: ${tokenRootAddress.toString()}`);
    console.log(`Translator deployed at: ${translatorAddress.toString()}`);
    console.log(`Initializer deployed at: ${initializerAddress.toString()}`);



    const { contract: gas } = await locklift.factory.deployContract({
        contract: "GasStation",
        publicKey: signer.publicKey,
        initParams: {
            owner_: owner,
            initializerLib_: initializer.address,
            useForceOrder_: false,
            disableHashValidation_: true,
            nonce_: locklift.utils.getRandomNonce().toFixed(),
            hashVersion_: HashHersions.CrosschainV1,
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
    // tracing = await locklift.tracing.trace(
    //     gas.methods.addStableCoin({
    //         _tokenRoot: tokenRootAddress,
    //         _decimals: decimals
    //     }).send({
    //         from: ownerWallet.address,
    //         amount: locklift.utils.toNano(1)
    //     })
    // );
    await gas.methods.addStableCoin({
        _tokenRoot: tokenRootAddress,
        _decimals: decimals
    }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
    });

    // tracing = await locklift.tracing.trace(
    //     gas.methods.setMinUsdAmount({
    //         _amount: 100
    //     }).send({
    //         from: ownerWallet.address,
    //         amount: locklift.utils.toNano(1)
    //     })
    // );
    await gas.methods.setMinUsdAmount({
        _amount: 15
    }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
    });

    // tracing = await locklift.tracing.trace(
    //     gas.methods.setMinUsdAmountPerChain({
    //         _amount: 10
    //     }).send({
    //         from: ownerWallet.address,
    //         amount: locklift.utils.toNano(1)
    //     })
    // );
    await gas.methods.setMinUsdAmountPerChain({
        _amount: 10
    }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
    });

    // tracing = await locklift.tracing.trace(
    //     gas.methods.addTrustedAddresses({
    //         _chainIds: chainIds,
    //         _trustedAddresses: trustedAddresses
    //     }).send({
    //         from: ownerWallet.address,
    //         amount: locklift.utils.toNano(1)
    //     })
    // );

    // tracing = await locklift.tracing.trace(
    //     gas.methods.buildGasPayload({
    //         _chainIds: [currentChain.id],
    //         _amounts: ['10000000000'],
    //         _receivers: [gasAddressUint.toString()],
    //     }).send({
    //         from: ownerWallet.address,
    //         amount: locklift.utils.toNano(1)
    //     })
    // );
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    process.exit(1);
  });
