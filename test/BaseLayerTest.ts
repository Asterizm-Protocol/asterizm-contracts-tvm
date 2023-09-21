import { expect } from "chai";
import { Address, WalletTypes, Contract, Signer } from "locklift";
import { FactorySource } from "../build/factorySource";
const bigInt = require("big-integer");

let translator1: Contract<FactorySource["AsterizmTranslator"]>;
let translator2: Contract<FactorySource["AsterizmTranslator"]>;
let externalTranslator1: Contract<FactorySource["AsterizmTranslator"]>;
let externalTranslator2: Contract<FactorySource["AsterizmTranslator"]>;
let initializer1: Contract<FactorySource["AsterizmInitializer"]>;
let initializer2: Contract<FactorySource["AsterizmInitializer"]>;
let demo1: Contract<FactorySource["AsterizmDemo"]>;
let demo2: Contract<FactorySource["AsterizmDemo"]>;
let signer: Signer;
let owner: Address;
let ownerPubkey: string;
let ownerWallet: any;
let trace;
const zeroAddress = new Address('0:0000000000000000000000000000000000000000000000000000000000000000');
const externalRelayFees = [100, 1000];
const externalRelaySystemFees = [10, 5];

const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");

const chainIds = [1, 2];
const chainTypes = {EVM: 1, TVM: 2};
const hashVersions = {
  CrosschainV1: 1,
  CrosschainV2: 2,
}
let globalTxId = new bigInt(0);

const sendMessageValue = 0.08;
const initAsterizmTransferValue = 0.4;
const transferMessageValue = 0.1;
const removeBlockAddressValue = 0.02;
const addBlockAddressValue = 0.02;
const transferSendingResultNotificationValue = 0.02;
const asterizmClReceiveValue = 0.4;
const resendAsterizmTransferValue = 0.1;
const resendTransferValue = 0.1;
const setExternalRelayValue = 0.05;

describe("Base layer tests", async function () {
    before(async () => {
        signer = (await locklift.keystore.getSigner("0"))!;
        owner = new Address(process.env.LOCALHOST_OWNER_ADDRESS || '');
        ownerPubkey = process.env.LOCALHOST_OWNER_KEY || '';
        
        ownerWallet = await locklift.factory.accounts.addExistingAccount({
        address: owner,
        type: WalletTypes.MsigAccount,
        mSigType: "multisig2",
        });
    });

    describe("Contract data", async function () {
        it("Should load contract factory", async function () {
            const translatorData = await locklift.factory.getContractArtifacts("AsterizmTranslator");
            expect(translatorData.code).not.to.equal(undefined, "Code should be available");
            expect(translatorData.abi).not.to.equal(undefined, "ABI should be available");
            expect(translatorData.tvc).not.to.equal(undefined, "tvc should be available");

            const initializerData = await locklift.factory.getContractArtifacts("AsterizmInitializer");
            expect(initializerData.code).not.to.equal(undefined, "Code should be available");
            expect(initializerData.abi).not.to.equal(undefined, "ABI should be available");
            expect(initializerData.tvc).not.to.equal(undefined, "tvc should be available");

            const demoData = await locklift.factory.getContractArtifacts("AsterizmDemo");
            expect(demoData.code).not.to.equal(undefined, "Code should be available");
            expect(demoData.abi).not.to.equal(undefined, "ABI should be available");
            expect(demoData.tvc).not.to.equal(undefined, "tvc should be available");
        });
    });

    describe("Deploy", async function () {
        it("Should deploy translator contracts", async function () {
            let { contract: translatorObj1 } = await locklift.factory.deployContract({
                contract: "AsterizmTranslator",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    localChainId_: chainIds[0],
                    localChainType_: chainTypes.TVM,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            translator1 = translatorObj1;
            expect(await locklift.provider.getBalance(translator1.address).then(balance => Number(balance))).to.be.above(0);
            await translator1.methods.addChain({
                _chainId: chainIds[1],
                _chainType: chainTypes.TVM,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });

            let { contract: translatorObj2 } = await locklift.factory.deployContract({
                contract: "AsterizmTranslator",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    localChainId_: chainIds[1],
                    localChainType_: chainTypes.TVM,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            translator2 = translatorObj2;
            expect(await locklift.provider.getBalance(translator2.address).then(balance => Number(balance))).to.be.above(0);
            await translator2.methods.addChain({
                _chainId: chainIds[0],
                _chainType: chainTypes.TVM,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
        });

        it("Should deploy initializer contracts", async function () {
            let { contract: initializerObj1 } = await locklift.factory.deployContract({
                contract: "AsterizmInitializer",
                publicKey: signer.publicKey,
                initParams: {
                owner_: owner,
                translatorLib_: translator1.address,
                initializerTransferCode_: AsterizmInitializerTransfer.code,
                clientTransferCode_: AsterizmClientTransfer.code,
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            initializer1 = initializerObj1;
            expect(await locklift.provider.getBalance(initializer1.address).then(balance => Number(balance))).to.be.above(0);

            let { contract: initializerObj2 } = await locklift.factory.deployContract({
                contract: "AsterizmInitializer",
                publicKey: signer.publicKey,
                initParams: {
                owner_: owner,
                translatorLib_: translator2.address,
                initializerTransferCode_: AsterizmInitializerTransfer.code,
                clientTransferCode_: AsterizmClientTransfer.code,
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            initializer2 = initializerObj2;
            expect(await locklift.provider.getBalance(initializer2.address).then(balance => Number(balance))).to.be.above(0);

            await translator1.methods.setInitializer({
                _initializerReceiver: initializer1.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            let trFields1 = await translator1.getFields();
            expect(trFields1.fields?.initializerLib.toString()).to.be.equal(initializer1.address.toString());
            await translator2.methods.setInitializer({
                _initializerReceiver: initializer2.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            let trFields2 = await translator2.getFields();
            expect(trFields2.fields?.initializerLib.toString()).to.be.equal(initializer2.address.toString());
        });

        it("Should deploy external relay contracts", async function () {
            let { contract: externalTranslatorObj1 } = await locklift.factory.deployContract({
                contract: "AsterizmTranslator",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    localChainId_: chainIds[0],
                    localChainType_: chainTypes.TVM,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            externalTranslator1 = externalTranslatorObj1;
            expect(await locklift.provider.getBalance(externalTranslator1.address).then(balance => Number(balance))).to.be.above(0);
            await externalTranslator1.methods.addChain({
                _chainId: chainIds[1],
                _chainType: chainTypes.TVM,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            
            let { contract: externalTranslatorObj2 } = await locklift.factory.deployContract({
                contract: "AsterizmTranslator",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    localChainId_: chainIds[1],
                    localChainType_: chainTypes.TVM,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            externalTranslator2 = externalTranslatorObj2;
            expect(await locklift.provider.getBalance(externalTranslator2.address).then(balance => Number(balance))).to.be.above(0);
            await externalTranslator2.methods.addChain({
                _chainId: chainIds[0],
                _chainType: chainTypes.TVM,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });

            await externalTranslator1.methods.setInitializer({
                _initializerReceiver: initializer1.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            let exTrFields1 = await externalTranslator1.getFields();
            expect(exTrFields1.fields?.initializerLib.toString()).to.be.equal(initializer1.address.toString());
            await externalTranslator2.methods.setInitializer({
                _initializerReceiver: initializer2.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            let exTrFields2 = await externalTranslator2.getFields();
            expect(exTrFields2.fields?.initializerLib.toString()).to.be.equal(initializer2.address.toString());

            trace = await locklift.tracing.trace(
                initializer1.methods.manageTrustedRelay({
                    _relayAddress: externalTranslator1.address,
                    _fee: externalRelayFees[0],
                    _systemFee: externalRelaySystemFees[0]
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(1)
                })
            );
            let eventIz1 = trace.traceTree?.findEventsForContract({
                contract: initializer1,
                name: "TrustedRelayEvent",
            });
            expect(eventIz1[0]._initializer.toString()).to.be.equal(ownerWallet.address.toString());
            expect(eventIz1[0]._relayAddress.toString()).to.be.equal(externalTranslator1.address.toString());
            expect(eventIz1[0]._fee).to.be.equal(externalRelayFees[0].toString());
            expect(eventIz1[0]._systemFee).to.be.equal(externalRelaySystemFees[0].toString());

            trace = await locklift.tracing.trace(
                initializer2.methods.manageTrustedRelay({
                    _relayAddress: externalTranslator2.address,
                    _fee: externalRelayFees[1],
                    _systemFee: externalRelaySystemFees[1]
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(1)
                })
            );
            let eventIz2 = trace.traceTree?.findEventsForContract({
                contract: initializer2,
                name: "TrustedRelayEvent",
            });
            expect(eventIz2[0]._initializer.toString()).to.be.equal(ownerWallet.address.toString());
            expect(eventIz2[0]._relayAddress.toString()).to.be.equal(externalTranslator2.address.toString());
            expect(eventIz2[0]._fee).to.be.equal(externalRelayFees[1].toString());
            expect(eventIz2[0]._systemFee).to.be.equal(externalRelaySystemFees[1].toString());
        });

        it("Should deploy demo contracts", async function () {
            let { contract: demoObj1 } = await locklift.factory.deployContract({
                contract: "AsterizmDemo",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    initializerLib_: initializer1.address,
                    notifyTransferSendingResult_: true,
                    disableHashValidation_: false,
                    hashVersion_: hashVersions.CrosschainV1,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            demo1 = demoObj1;

            expect(await locklift.provider.getBalance(demo1.address).then(balance => Number(balance))).to.be.above(0);
            let demoFields1 = await demo1.getFields();
            expect(demoFields1.fields?.initializerLib_.toString()).to.be.equal(initializer1.address.toString());

            let { contract: demoObj2 } = await locklift.factory.deployContract({
                contract: "AsterizmDemo",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    initializerLib_: initializer2.address,
                    notifyTransferSendingResult_: true,
                    disableHashValidation_: false,
                    hashVersion_: hashVersions.CrosschainV1,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            demo2 = demoObj2;

            expect(await locklift.provider.getBalance(demo2.address).then(balance => Number(balance))).to.be.above(0);
            let demoFields2 = await demo2.getFields();
            expect(demoFields2.fields?.initializerLib_.toString()).to.be.equal(initializer2.address.toString());

            const demo1AddressUint = new bigInt(demo1.address.toString().substring(2), 16);
            const demo2AddressUint = new bigInt(demo2.address.toString().substring(2), 16);
            await demo1.methods.addTrustedAddresses({
                _chainIds: chainIds,
                _trustedAddresses: [demo1AddressUint.value.toString(), demo2AddressUint.value.toString()]
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            await demo2.methods.addTrustedAddresses({
                _chainIds: chainIds,
                _trustedAddresses: [demo1AddressUint.value.toString(), demo2AddressUint.value.toString()]
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
        });
    });

    describe("Logic", async function () {
        it("Should emit SendMessageEvent event on Translator", async function () {
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo[0]._txId).to.be.equal(globalTxId.toString());
            expect(eventDemo[0]._transferHash).to.be.not.empty;
            expect(eventDemo[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo[0]._dstChainId),
                    _txId: parseInt(eventDemo[0]._txId),
                    _transferHash: eventDemo[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            expect(eventTr[0]._feeValue).to.be.equal('0');
            expect(eventDemo[0]._payload).to.be.not.empty;
        });
        
        it("Should send transfer message from destination translator", async function () {
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[0],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo[0]._dstChainId).to.be.equal(chainIds[0].toString());
            expect(eventDemo[0]._dstAddress).to.be.equal((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo[0]._transferHash).to.be.not.empty;
            expect(eventDemo[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo[0]._dstChainId),
                    _txId: parseInt(eventDemo[0]._txId),
                    _transferHash: eventDemo[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SuccessTransferEvent",
            });
            expect(eventTr.length).to.be.equals(1);

            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            expect(eventTr1.length).to.be.equals(1);
            trace = await locklift.tracing.trace(
                translator2.methods.transferMessage({
                    _gasLimit: parseInt(eventTr1[0]._feeValue),
                    _payload: eventTr1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
        });

        it("Should not sent from/to blocked address, then success send message", async function () {
            trace = await locklift.tracing.trace(
                initializer1.methods.addBlockAddress({
                    _chainId: chainIds[1],
                    _address: (new bigInt(demo2.address.toString().substring(2), 16)).value.toString()
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(addBlockAddressValue)
                })
            );
            let eventIz = trace.traceTree.findEventsForContract({
                contract: initializer1,
                name: "AddBlockAddressEvent",
            });
            expect(eventIz.length).to.be.equals(1);

            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo[0]._transferHash).to.be.not.empty;
            expect(eventDemo[0]._payload).to.be.not.empty;
            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo[0]._dstChainId),
                    _txId: parseInt(eventDemo[0]._txId),
                    _transferHash: eventDemo[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                }),
                {
                    allowedCodes: { compute: [3003] },
                }
            );
            let izErrors = trace.traceTree?.getErrorsByContract(initializer1);
            expect(izErrors[0].code).to.be.equals(3003);
            trace = await locklift.tracing.trace(
                initializer1.methods.removeBlockAddress({
                    _chainId: chainIds[1]
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(removeBlockAddressValue)
                })
            );
            let eventIz1 = trace.traceTree?.findEventsForContract({
                contract: initializer1,
                name: "RemoveBlockAddressEvent",
            });
            expect(eventIz1?.length).to.be.equals(1);

            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            expect(eventTr1.length).to.be.equals(1);
            trace = await locklift.tracing.trace(
                translator2.methods.transferMessage({
                    _gasLimit: parseInt(eventTr1[0]._feeValue),
                    _payload: eventTr1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(transferMessageValue)
                })
            );

        });

        it("Should send message with fee", async function () {
            const feeValue = 1000;
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: feeValue
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            let unpackPayload = await locklift.provider.unpackFromCell({
                structure: [
                    { name: 'srcChainId', type: 'uint64' },
                    { name: 'srcAddress', type: 'uint256' },
                    { name: 'dstChainId', type: 'uint64' },
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'notifyFlag', type: 'bool' },
                    { name: 'transferHash', type: 'uint256' },
                ],
                boc: eventTr1[0]._payload,
                allowPartial: true
            });
            expect(eventTr1[0]._feeValue).to.be.equals(feeValue.toString());
            expect(unpackPayload.data.srcChainId).to.be.equals(chainIds[0].toString());
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(eventDemo1[0]._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(eventDemo1[0]._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(eventDemo1[0]._transferHash);
            trace = await locklift.tracing.trace(
                translator2.methods.transferMessage({
                    _gasLimit: parseInt(eventTr1[0]._feeValue),
                    _payload: eventTr1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(transferMessageValue)
                })
            );
        });

        it("Should transfer fully completed and emit TransferSendingResultNotification event", async function () {
            const newMessage = 'New message';
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: newMessage
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            let unpackPayload = await locklift.provider.unpackFromCell({
                structure: [
                    { name: 'srcChainId', type: 'uint64' },
                    { name: 'srcAddress', type: 'uint256' },
                    { name: 'dstChainId', type: 'uint64' },
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'notifyFlag', type: 'bool' },
                    { name: 'transferHash', type: 'uint256' },
                ],
                boc: eventTr1[0]._payload,
                allowPartial: true
            });
            expect(unpackPayload.data.srcChainId).to.be.equals(chainIds[0].toString());
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(eventDemo1[0]._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(eventDemo1[0]._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(eventDemo1[0]._transferHash);

            trace = await locklift.tracing.trace(
                externalTranslator2.methods.transferMessage({
                    _gasLimit: parseInt(eventTr1[0]._feeValue),
                    _payload: eventTr1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(transferMessageValue)
                })
            );
            let eventDemo2 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "PayloadReceivedEvent",
            });
            expect(eventDemo2[0]._srcChainId).to.be.equal(chainIds[0].toString());
            expect(eventDemo2[0]._srcAddress).to.be.equal((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo2[0]._txId).to.be.equal(globalTxId.toString());
            expect(eventDemo2[0]._transferHash).to.be.equal(eventDemo1[0]._transferHash);

            const statusCode = 0;
            trace = await locklift.tracing.trace(
                translator1.methods.transferSendingResultNotification({
                    _targetAddress: demo1.address,
                    _transferHash: unpackPayload.data.transferHash,
                    _statusCode: statusCode
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(transferSendingResultNotificationValue)
                })
            );
            let eventTr3 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "TransferSendingResultNotification",
            });
            expect(eventTr3[0]._transferHash).to.be.equals(unpackPayload.data.transferHash);
            expect(eventTr3[0]._statusCode).to.be.equals(statusCode.toString());

            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(eventDemo2[0]._srcChainId),
                    _srcAddress: eventDemo2[0]._srcAddress,
                    _txId: eventDemo2[0]._txId,
                    _transferHash: eventDemo2[0]._transferHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                })
            );
            let eventDemo3 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "SuccessTransferExecutedEvent",
            });
            expect(eventDemo3[0]._transferHash).to.be.equal(eventDemo2[0]._transferHash);
            let eventDemo4 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "SetChainMessageEvent",
            });
            expect(eventDemo4[0]._message).to.be.equal(newMessage);
        });

        it("Should resend message from client and initializer contracts", async function () {
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
            contract: demo1,
            name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            let unpackPayload = await locklift.provider.unpackFromCell({
                structure: [
                    { name: 'srcChainId', type: 'uint64' },
                    { name: 'srcAddress', type: 'uint256' },
                    { name: 'dstChainId', type: 'uint64' },
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'notifyFlag', type: 'bool' },
                    { name: 'transferHash', type: 'uint256' },
                ],
                boc: eventTr1[0]._payload,
                allowPartial: true
            });
            expect(unpackPayload.data.srcChainId).to.be.equals(chainIds[0].toString());
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(eventDemo1[0]._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(eventDemo1[0]._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(eventDemo1[0]._transferHash);

            const feeAmount = 1000;
            trace = await locklift.tracing.trace(
                demo1.methods.resendAsterizmTransfer({
                    _transferHash: unpackPayload.data.transferHash,
                    _feeAmount: feeAmount
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(resendAsterizmTransferValue)
                })
            );
            let eventTr2 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "ResendFailedTransferEvent",
            });
            expect(eventTr2[0]._transferHash).to.be.equals(unpackPayload.data.transferHash);
            expect(eventTr2[0]._senderAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(eventTr2[0]._feeAmount).to.be.equals(feeAmount.toString());

            trace = await locklift.tracing.trace(
                initializer1.methods.resendTransfer({
                    _transferHash: unpackPayload.data.transferHash,
                    _feeAmount: feeAmount,
                    _relay: zeroAddress
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(resendTransferValue)
                })
            );
            let eventTr3 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "ResendFailedTransferEvent",
            });
            expect(eventTr3[0]._transferHash).to.be.equals(unpackPayload.data.transferHash);
            expect(eventTr3[0]._senderAddress).to.be.equals((new bigInt(ownerWallet.address.toString().substring(2), 16)).value.toString());
            expect(eventTr3[0]._feeAmount).to.be.equals(feeAmount.toString());
        });

        it("Should not init transfer in source chain second times", async function () {
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
            contract: demo1,
            name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            let unpackPayload = await locklift.provider.unpackFromCell({
                structure: [
                    { name: 'srcChainId', type: 'uint64' },
                    { name: 'srcAddress', type: 'uint256' },
                    { name: 'dstChainId', type: 'uint64' },
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'notifyFlag', type: 'bool' },
                    { name: 'transferHash', type: 'uint256' },
                ],
                boc: eventTr1[0]._payload,
                allowPartial: true
            });
            expect(unpackPayload.data.srcChainId).to.be.equals(chainIds[0].toString());
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(eventDemo1[0]._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(eventDemo1[0]._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(eventDemo1[0]._transferHash);

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let demoErrorEvent = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "ErrorTransferExecutedEvent",
            });
            expect(demoErrorEvent?.length).to.be.equals(1);
            expect(demoErrorEvent[0]._errorCode).to.be.equals('4006');
            expect(demoErrorEvent[0]._transferHash).to.be.equals(eventDemo1[0]._transferHash);
        });

        it("Should not init transfer in source chain with wrong init params", async function () {
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
            contract: demo1,
            name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            let wrongTransferHash = '1234567890';
            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: wrongTransferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                }),
                {
                    allowedCodes: { compute: [null, 9] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);

            let wrongTxId = '100500';
            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(wrongTxId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                }),
                {
                    allowedCodes: { compute: [4011] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(4011);

            let wrongDstChainId = '100500';
            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(wrongDstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                }),
                {
                    allowedCodes: { compute: [4009] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(4009);
        });

        it("Should not execute transfer in destination chain with wrong receive params", async function () {
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
            contract: demo1,
            name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            let unpackPayload = await locklift.provider.unpackFromCell({
                structure: [
                    { name: 'srcChainId', type: 'uint64' },
                    { name: 'srcAddress', type: 'uint256' },
                    { name: 'dstChainId', type: 'uint64' },
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'notifyFlag', type: 'bool' },
                    { name: 'transferHash', type: 'uint256' },
                ],
                boc: eventTr1[0]._payload,
                allowPartial: true
            });
            expect(unpackPayload.data.srcChainId).to.be.equals(chainIds[0].toString());
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(eventDemo1[0]._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(eventDemo1[0]._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(eventDemo1[0]._transferHash);
            trace = await locklift.tracing.trace(
                translator2.methods.transferMessage({
                    _gasLimit: parseInt(eventTr1[0]._feeValue),
                    _payload: eventTr1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(transferMessageValue)
                })
            );
            let eventTr2 = trace.traceTree?.findEventsForContract({
                contract: translator2,
                name: "TransferSendEvent",
            });
            expect(eventTr2?.length).to.be.equals(1);
            let eventDemo2 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "PayloadReceivedEvent",
            });
            expect(eventDemo2?.length).to.be.equals(1);
            let firstDemoEvent2 = eventDemo2[0];
            expect(firstDemoEvent2._srcChainId).to.be.equals(chainIds[0].toString());
            expect(firstDemoEvent2._srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(firstDemoEvent2._nonce).to.be.equals(unpackPayload.data.nonce);
            expect(firstDemoEvent2._txId).to.be.equals(unpackPayload.data.txId);
            expect(firstDemoEvent2._transferHash).to.be.equals(unpackPayload.data.transferHash);

            const wrongHash = '1234567890';
            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(firstDemoEvent2._srcChainId),
                    _srcAddress: firstDemoEvent2._srcAddress,
                    _txId: firstDemoEvent2._txId,
                    _transferHash: wrongHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                }),
                {
                    allowedCodes: { compute: [4004] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(4004);

            const wrongTxId = '9999999999999999999';
            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(firstDemoEvent2._srcChainId),
                    _srcAddress: firstDemoEvent2._srcAddress,
                    _txId: wrongTxId,
                    _transferHash: firstDemoEvent2._transferHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                }),
                {
                    allowedCodes: { compute: [4004] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(4004);

            const wrongSrcAddress = '9999999999999999999';
            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(firstDemoEvent2._srcChainId),
                    _srcAddress: wrongSrcAddress,
                    _txId: firstDemoEvent2._txId,
                    _transferHash: firstDemoEvent2._transferHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                }),
                {
                    allowedCodes: { compute: [4003] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(4003);

            const wrongSrcChainId = '100500';
            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(wrongSrcChainId),
                    _srcAddress: firstDemoEvent2._srcAddress,
                    _txId: firstDemoEvent2._txId,
                    _transferHash: firstDemoEvent2._transferHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                }),
                {
                    allowedCodes: { compute: [4003] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(4003);
        });

        it("Should not execute transfer in destination chain second times", async function () {
            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: 'New message'
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: translator1,
                name: "SendMessageEvent",
            });
            let unpackPayload = await locklift.provider.unpackFromCell({
                structure: [
                    { name: 'srcChainId', type: 'uint64' },
                    { name: 'srcAddress', type: 'uint256' },
                    { name: 'dstChainId', type: 'uint64' },
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'notifyFlag', type: 'bool' },
                    { name: 'transferHash', type: 'uint256' },
                ],
                boc: eventTr1[0]._payload,
                allowPartial: true
            });
            expect(unpackPayload.data.srcChainId).to.be.equals(chainIds[0].toString());
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(eventDemo1[0]._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(eventDemo1[0]._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(eventDemo1[0]._transferHash);
            trace = await locklift.tracing.trace(
                translator2.methods.transferMessage({
                    _gasLimit: parseInt(eventTr1[0]._feeValue),
                    _payload: eventTr1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(transferMessageValue)
                })
            );
            let eventTr2 = trace.traceTree?.findEventsForContract({
                contract: translator2,
                name: "TransferSendEvent",
            });
            expect(eventTr2?.length).to.be.equals(1);
            let eventDemo2 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "PayloadReceivedEvent",
            });
            expect(eventDemo2?.length).to.be.equals(1);
            let firstDemoEvent2 = eventDemo2[0];
            expect(firstDemoEvent2._srcChainId).to.be.equals(chainIds[0].toString());
            expect(firstDemoEvent2._srcAddress).to.be.equals((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(firstDemoEvent2._nonce).to.be.equals(unpackPayload.data.nonce);
            expect(firstDemoEvent2._txId).to.be.equals(unpackPayload.data.txId);
            expect(firstDemoEvent2._transferHash).to.be.equals(unpackPayload.data.transferHash);
            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(firstDemoEvent2._srcChainId),
                    _srcAddress: firstDemoEvent2._srcAddress,
                    _txId: firstDemoEvent2._txId,
                    _transferHash: firstDemoEvent2._transferHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                })
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.equals(0);

            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(firstDemoEvent2._srcChainId),
                    _srcAddress: firstDemoEvent2._srcAddress,
                    _txId: firstDemoEvent2._txId,
                    _transferHash: firstDemoEvent2._transferHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                }),
                {
                    allowedCodes: { compute: [4014] },
                }
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.greaterThan(0);
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(4014);
        });

        it("Should success send message with externl relays logic", async function () {
            const newMessage = 'New message';

            trace = await locklift.tracing.trace(
                demo1.methods.setExternalRelay({
                    _externalRelay: externalTranslator1.address
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setExternalRelayValue)
                })
            );
            let eventDemoParams1 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "SetExternalRelayEvent",
            });
            expect(eventDemoParams1[0]._externalRelayAddress.toString()).to.be.equal(externalTranslator1.address.toString());

            trace = await locklift.tracing.trace(
                demo1.methods.sendMessage({
                    _dstChainId: chainIds[1],
                    _message: newMessage
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(sendMessageValue)
                })
            );
            let eventDemo1 = trace.traceTree?.findEventsForContract({
                contract: demo1,
                name: "InitiateTransferEvent",
            });
            expect(eventDemo1[0]._dstChainId).to.be.equal(chainIds[1].toString());
            expect(eventDemo1[0]._dstAddress).to.be.equal((new bigInt(demo2.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo1[0]._txId).to.be.equal((globalTxId = globalTxId.plus(1)).toString());
            expect(eventDemo1[0]._transferHash).to.be.not.empty;
            expect(eventDemo1[0]._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                demo1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(eventDemo1[0]._dstChainId),
                    _txId: parseInt(eventDemo1[0]._txId),
                    _transferHash: eventDemo1[0]._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let eventTr1 = trace.traceTree?.findEventsForContract({
                contract: externalTranslator1,
                name: "SendMessageEvent",
            });
            expect(eventTr1.length).to.be.equals(1);
            trace = await locklift.tracing.trace(
                externalTranslator2.methods.transferMessage({
                    _gasLimit: parseInt(eventTr1[0]._feeValue),
                    _payload: eventTr1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(transferMessageValue)
                })
            );
            let eventDemo2 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "PayloadReceivedEvent",
            });
            expect(eventDemo2[0]._srcChainId).to.be.equal(chainIds[0].toString());
            expect(eventDemo2[0]._srcAddress).to.be.equal((new bigInt(demo1.address.toString().substring(2), 16)).value.toString());
            expect(eventDemo2[0]._txId).to.be.equal(globalTxId.toString());
            expect(eventDemo2[0]._transferHash).to.be.equal(eventDemo1[0]._transferHash);

            trace = await locklift.tracing.trace(
                demo2.methods.asterizmClReceive({
                    _srcChainId: parseInt(eventDemo2[0]._srcChainId),
                    _srcAddress: eventDemo2[0]._srcAddress,
                    _txId: eventDemo2[0]._txId,
                    _transferHash: eventDemo2[0]._transferHash,
                    _payload: eventDemo1[0]._payload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                })
            );
            let eventDemo3 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "SuccessTransferExecutedEvent",
            });
            expect(eventDemo3[0]._transferHash).to.be.equal(eventDemo2[0]._transferHash);
            let eventDemo4 = trace.traceTree?.findEventsForContract({
                contract: demo2,
                name: "SetChainMessageEvent",
            });
            expect(eventDemo4[0]._message).to.be.equal(newMessage);
        });
    });
});
