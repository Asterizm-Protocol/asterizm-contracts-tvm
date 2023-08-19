import {Address, WalletTypes} from "locklift";
import {EverWalletAccount} from "everscale-standalone-client/nodejs";
const bigInt = require("big-integer");
import { Chains } from './base/base_chains';
import { ChainTypes } from './base/base_chain_types';
import { NetworkTypes } from './base/base_network_types';
import { HashVersions } from './base/base_hash_versions';
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
        // tokenRootAddress = new Address('0:d5756401c0e2ad938bb980e72846f22f02b15d83c2c9190f93c0c2ff44771336');
        tokenRootAddress = new Address('0:4a2219d92ed7971c16093c04dc2f442925fcfb4f1c7f18fc4b6b18cf100b27aa');
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
        if (chains[i].trustAddresses.gas.uint != '0') {
          trustedAddresses.push(chains[i].trustAddresses.gas.uint);
        }
    }

    currentChain = currentChain ? currentChain : chains[0];
  
    let translatorAddress;
    let tracing;
    // translatorAddress = new Address("0:3a46266d9bf069762fbb36eaea854dac90157308dccc9a57c6a50f4b0e1f6d65");
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
  
      tracing = await locklift.tracing.trace(
        translatorObj1.methods.addChains({
          _chainIds: chainIds,
          _chainTypes: chainTypes,
        }).send({
          from: ownerWallet.address,
          amount: locklift.utils.toNano(1)
        })
      );
        // await translatorObj1.methods.addChains({
        //     _chainIds: chainIds,
        //     _chainTypes: chainTypes,
        // }).send({
        //     from: ownerWallet.address,
        //     amount: locklift.utils.toNano(1)
        // });
    }
  
    const translator = locklift.factory.getDeployedContract("AsterizmTranslator", translatorAddress);
  
  
    const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
    const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");
    const AsterizmNonce = locklift.factory.getContractArtifacts("AsterizmNonce");
  
    let initializerAddress;
    // initializerAddress = new Address("0:55402fc4799d6e7e2cb86f70cc6ea922090538dffb19d08ecce85dfb4c392de9");
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
  
      tracing = await locklift.tracing.trace(
        translator.methods.setInitializer({
        _initializerReceiver: initializer1.address,
      }).send({
        from: ownerWallet.address,
        amount: locklift.utils.toNano(1)
      })
    );
        // await translator.methods.setInitializer({
        //     _initializerReceiver: initializer1.address,
        // }).send({
        //     from: ownerWallet.address,
        //     amount: locklift.utils.toNano(1)
        // });
    }


    const initializer = locklift.factory.getDeployedContract("AsterizmInitializer", initializerAddress);


    console.log(`TestToken (ATT) deployed at: ${tokenRootAddress.toString()}`);
    console.log(`Translator deployed at: ${translatorAddress.toString()}`);
    console.log(`Initializer deployed at: ${initializerAddress.toString()}`);



    let gasAddress;
    // gasAddress = new Address("0:bbc77c9530eb2911428f0073348fbf4c7c9c77566b5fb91a17133ccb29bbc34e");
    if (!gasAddress) {
        const {contract: gasObject} = await locklift.factory.deployContract({
            contract: "GasStation",
            publicKey: signer.publicKey,
            initParams: {
                owner_: owner,
                initializerLib_: initializer.address,
                useForceOrder_: false,
                disableHashValidation_: true,
                nonce_: locklift.utils.getRandomNonce().toFixed(),
                hashVersion_: HashVersions.CrosschainV1,
            },
            constructorParams: {},
            value: locklift.utils.toNano(2),
        });
        gasAddress = gasObject.address;
    }

    const gas = locklift.factory.getDeployedContract("GasStation", gasAddress);
    console.log(`GasSender deployed at: ${gas.address.toString()}`);

    const gasAddressUint = new bigInt(gasAddress.toString().substring(2), 16);

    for (let i = 0; i < chainIds.length; i++) {
        if (chainIds[i] == currentChain.id) {
            trustedAddresses[i] = gasAddressUint.value.toString();
            break;
        }
    }

    tracing = await locklift.tracing.trace(
        gas.methods.addStableCoin({
            _tokenRoot: tokenRootAddress,
            _decimals: decimals
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );
    // await gas.methods.addStableCoin({
    //     _tokenRoot: tokenRootAddress,
    //     _decimals: decimals
    // }).send({
    //     from: ownerWallet.address,
    //     amount: locklift.utils.toNano(1)
    // });

    tracing = await locklift.tracing.trace(
        gas.methods.setMinUsdAmount({
            _amount: 100
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );
    // await gas.methods.setMinUsdAmount({
    //     _amount: 15
    // }).send({
    //     from: ownerWallet.address,
    //     amount: locklift.utils.toNano(1)
    // });

    tracing = await locklift.tracing.trace(
        gas.methods.setMaxUsdAmount({
            _amount: 200
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );
    // await gas.methods.setMaxUsdAmount({
    //     _amount: 200
    // }).send({
    //     from: ownerWallet.address,
    //     amount: locklift.utils.toNano(1)
    // });

    tracing = await locklift.tracing.trace(
        gas.methods.setMinUsdAmountPerChain({
            _amount: 10
        }).send({
            from: ownerWallet.address,
            amount: locklift.utils.toNano(1)
        })
    );
    // await gas.methods.setMinUsdAmountPerChain({
    //     _amount: 10
    // }).send({
    //     from: ownerWallet.address,
    //     amount: locklift.utils.toNano(1)
    // });

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
