import { expect } from "chai";
import { Address, WalletTypes, Contract, Signer, zeroAddress } from "locklift";
import { FactorySource } from "../build/factorySource";
const bigInt = require("big-integer");
import BigNumber from "bignumber.js";

let translator1: Contract<FactorySource["AsterizmTranslator"]>;
let translator2: Contract<FactorySource["AsterizmTranslator"]>;
let initializer1: Contract<FactorySource["AsterizmInitializer"]>;
let initializer2: Contract<FactorySource["AsterizmInitializer"]>;
let token: Contract<FactorySource["AsterizmTestTokenRoot"]>;
let gas1: Contract<FactorySource["GasStation"]>;
let gas2: Contract<FactorySource["GasStation"]>;
let signer: Signer;
let owner: Address;
let ownerPubkey: string;
let ownerWallet: any;
let trace;

const AsterizmInitializerTransfer = locklift.factory.getContractArtifacts("AsterizmInitializerTransfer");
const AsterizmClientTransfer = locklift.factory.getContractArtifacts("AsterizmClientTransfer");
const TokenWallet = locklift.factory.getContractArtifacts("AsterizmTestTokenWallet");

const chainIds = [1, 2];
const chainTypes = {EVM: 1, TVM: 2};
const hashVersions = {
    CrosschainV1: 1,
    CrosschainV2: 2,
}
const decimals = 9;
const pow = BigNumber(10).pow(decimals);

const initTransferValue = 0.1;
const withdrawCoinsValue = 0.1;
const withdrawTokensValue = 0.1;
const setAmountsValue = 0.02;
const initAsterizmTransferValue = 0.4;
const transferMessageValue = 0.1;
const asterizmClReceiveValue = 0.4;

describe("Gas station tests", async function () {
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

            const tokenRootData = await locklift.factory.getContractArtifacts("AsterizmTestTokenRoot");
            expect(tokenRootData.code).not.to.equal(undefined, "Code should be available");
            expect(tokenRootData.abi).not.to.equal(undefined, "ABI should be available");
            expect(tokenRootData.tvc).not.to.equal(undefined, "tvc should be available");

            const tokenWalletData = await locklift.factory.getContractArtifacts("AsterizmTestTokenWallet");
            expect(tokenWalletData.code).not.to.equal(undefined, "Code should be available");
            expect(tokenWalletData.abi).not.to.equal(undefined, "ABI should be available");
            expect(tokenWalletData.tvc).not.to.equal(undefined, "tvc should be available");

            const gasData = await locklift.factory.getContractArtifacts("GasStation");
            expect(gasData.code).not.to.equal(undefined, "Code should be available");
            expect(gasData.abi).not.to.equal(undefined, "ABI should be available");
            expect(gasData.tvc).not.to.equal(undefined, "tvc should be available");
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
            expect(trFields1.fields.initializerLib.toString()).to.be.equal(initializer1.address.toString());
            await translator2.methods.setInitializer({
                _initializerReceiver: initializer2.address,
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            let trFields2 = await translator2.getFields();
            expect(trFields2.fields.initializerLib.toString()).to.be.equal(initializer2.address.toString());
        });

        it("Should deploy token contracts", async function () {
            let { contract: tokenObj1 } = await locklift.factory.deployContract({
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
    
            token = tokenObj1;
            expect(await locklift.provider.getBalance(token.address).then(balance => Number(balance))).to.be.above(0);

            trace = await locklift.tracing.trace(token.methods.mint({
                amount: 10000000000 * (10 ** decimals),
                recipient: ownerWallet.address,
                deployWalletValue: locklift.utils.toNano(0.1),
                remainingGasTo: ownerWallet.address,
                notify: false,
                payload: "",
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            }));
            const tokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: ownerWallet.address}).call()).value0;
            const tokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', tokenWalletAddress);
            const { value0: tokenWalletBalance } = await tokenWallet.methods.balance({ answerId: 0 }).call();
            const { value0: totalSupply } = await token.methods.totalSupply({ answerId: 0 }).call();
            expect(totalSupply).to.be.equals('10000000000000000000');
            expect(tokenWalletBalance).to.be.equals(totalSupply);
        });

        it("Should deploy gas contracts", async function () {
            let { contract: gas1Obj1 } = await locklift.factory.deployContract({
                contract: "GasStation",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    initializerLib_: initializer1.address,
                    notifyTransferSendingResult_: true,
                    disableHashValidation_: true,
                    hashVersion_: hashVersions.CrosschainV1,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            gas1 = gas1Obj1;

            expect(await locklift.provider.getBalance(gas1.address).then(balance => Number(balance))).to.be.above(0);
            let gasFields1 = await gas1.getFields();
            expect(gasFields1.fields.initializerLib_.toString()).to.be.equal(initializer1.address.toString());

            let { contract: gasObj2 } = await locklift.factory.deployContract({
                contract: "GasStation",
                publicKey: signer.publicKey,
                initParams: {
                    owner_: owner,
                    initializerLib_: initializer2.address,
                    notifyTransferSendingResult_: true,
                    disableHashValidation_: true,
                    hashVersion_: hashVersions.CrosschainV1,
                    nonce_: locklift.utils.getRandomNonce().toFixed(),
                },
                constructorParams: {},
                value: locklift.utils.toNano(1.5),
            });
            gas2 = gasObj2;

            expect(await locklift.provider.getBalance(gas2.address).then(balance => Number(balance))).to.be.above(0);
            let gasFields2 = await gas2.getFields();
            expect(gasFields2.fields.initializerLib_.toString()).to.be.equal(initializer2.address.toString());

            await gas1.methods.addTrustedAddresses({
                _chainIds: chainIds,
                _trustedAddresses: [(new bigInt(gas1.address.toString().substring(2), 16)).value.toString(), (new bigInt(gas2.address.toString().substring(2), 16)).value.toString()]
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            await gas2.methods.addTrustedAddresses({
                _chainIds: chainIds,
                _trustedAddresses: [(new bigInt(gas1.address.toString().substring(2), 16)).value.toString(), (new bigInt(gas2.address.toString().substring(2), 16)).value.toString()]
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });

            await gas1.methods.addStableCoin({
                _tokenRoot: token.address,
                _decimals: decimals
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
            await gas2.methods.addStableCoin({
                _tokenRoot: token.address,
                _decimals: decimals
            }).send({
                from: ownerWallet.address,
                amount: locklift.utils.toNano(1)
            });
        });
    });

    describe("Logic", async function () {
        it("Should deposit and withdraw coins and tokens", async function () {
            const gasTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: gas1.address}).call()).value0;
            const gasTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', gasTokenWalletAddress);
            const ownerTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: ownerWallet.address}).call()).value0;
            const ownerTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', ownerTokenWalletAddress);

            const balanceGasBefore = await locklift.provider.getBalance(gas1.address);
            await locklift.giver.sendTo(gas1.address, locklift.utils.toNano(1));
            const balanceGasAfter = await locklift.provider.getBalance(gas1.address);
            expect(parseInt(balanceGasAfter)).to.be.greaterThan(parseInt(balanceGasBefore));
            const balanceOwnerBefore = await locklift.provider.getBalance(ownerWallet.address);
            trace = await locklift.tracing.trace(
                gas1.methods.withdrawCoins({
                    _target: ownerWallet.address,
                    _amount: locklift.utils.toNano(1)
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(withdrawCoinsValue)
                })
            );
            const balanceOwnerAfter = await locklift.provider.getBalance(ownerWallet.address);
            expect(parseInt(balanceGasAfter)).to.be.greaterThan(parseInt(balanceGasBefore));

            const tokenValue = locklift.utils.toNano(10);
            const { value0: gasTokenBalanceBefore } = await gasTokenWallet.methods.balance({ answerId: 0 }).call();
            expect(gasTokenBalanceBefore).to.be.equals('0');
            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: tokenValue,
                    recipient: gas1.address,
                    deployWalletValue: 0,
                    remainingGasTo: owner,
                    notify: false,
                    payload: 'te6ccgEBAQEAAgAAAA=='
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                })
            );
            const { value0: gasTokenBalanceAfter } = await gasTokenWallet.methods.balance({ answerId: 0 }).call();
            expect(gasTokenBalanceAfter).to.be.equals(tokenValue);
            trace = await locklift.tracing.trace(
                gas1.methods.withdrawTokens({
                    _tokenRoot: token.address,
                    _target: ownerWallet.address,
                    _amount: tokenValue
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(withdrawTokensValue)
                })
            );
            const { value0: gasTokenBalanceFinal } = await gasTokenWallet.methods.balance({ answerId: 0 }).call();
            expect(gasTokenBalanceFinal).to.be.equals('0');
        });

        it("Should emit InitiateTransferEvent event on gas contract (include amount validations)", async function () {
            let valueInUsd = 100;
            let value = BigNumber(valueInUsd).multipliedBy(pow);
            const gasTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: gas1.address}).call()).value0;
            const gasTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', gasTokenWalletAddress);
            const ownerTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: ownerWallet.address}).call()).value0;
            const ownerTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', ownerTokenWalletAddress);

            let transferPayload = (await locklift.provider.packIntoCell({
                structure: [
                    { name: 'chainIds', type: 'uint64[]' },
                    { name: 'amounts', type: 'uint256[]' },
                    { name: 'receivers', type: 'uint256[]' },
                ],
                data: {
                    chainIds: [chainIds[1]],
                    amounts: [value.toFixed()],
                    receivers: [(new bigInt(ownerWallet.address.toString().substring(2), 16)).value.toString()],
                }
            })).boc;

            await locklift.tracing.trace(
                gas1.methods.setMinUsdAmount({
                    _amount: 1000
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );
            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: '0',
                    remainingGasTo: ownerWallet.address,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                }),
                {
                    allowedCodes: { compute: [7005] },
                }
            );
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(7005);
            await locklift.tracing.trace(
                gas1.methods.setMinUsdAmount({
                    _amount: 5
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );

            await locklift.tracing.trace(
                gas1.methods.setMaxUsdAmount({
                    _amount: 1
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );
            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: '0',
                    remainingGasTo: ownerWallet.address,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                }),
                {
                    allowedCodes: { compute: [7006] },
                }
            );
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(7006);
            await locklift.tracing.trace(
                gas1.methods.setMaxUsdAmount({
                    _amount: 1000
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );

            await locklift.tracing.trace(
                gas1.methods.setMinUsdAmountPerChain({
                    _amount: 1000
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );
            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: '0',
                    remainingGasTo: ownerWallet.address,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                }),
                {
                    allowedCodes: { compute: [7013] },
                }
            );
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(7013);
            await locklift.tracing.trace(
                gas1.methods.setMinUsdAmountPerChain({
                    _amount: 5
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );

            await locklift.tracing.trace(
                gas1.methods.setMaxUsdAmountPerChain({
                    _amount: 1
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );
            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: '0',
                    remainingGasTo: ownerWallet.address,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                }),
                {
                    allowedCodes: { compute: [7014] },
                }
            );
            expect(trace.traceTree?.getAllErrors()[0].code).to.be.equals(7014);
            await locklift.tracing.trace(
                gas1.methods.setMaxUsdAmountPerChain({
                    _amount: 1000
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(setAmountsValue)
                })
            );

            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: 0,
                    remainingGasTo: owner,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                })
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.equals(0);
            let eventGas = trace.traceTree?.findEventsForContract({
                contract: gas1,
                name: "InitiateTransferEvent",
            });
            expect(eventGas?.length).to.be.equals(1);
            let firstEvent = eventGas[0];
            expect(firstEvent._dstChainId).to.be.equals(chainIds[1].toString());
            expect(firstEvent._dstAddress).to.be.equals((new bigInt(gas2.address.toString().substring(2), 16)).value.toString());
            expect(firstEvent._txId).to.be.equals('0');
            expect(firstEvent._transferHash).to.be.not.empty;
            expect(firstEvent._payload).to.be.not.empty;
        });

        it("Should transfer fully complete", async function () {
            let valueInUsd = 10;
            let value = BigNumber(valueInUsd).multipliedBy(pow);
            let rate = locklift.utils.toNano(1);
            const reveiverAddress = ownerWallet.address;
            await locklift.giver.sendTo(gas2.address, locklift.utils.toNano(100));
            const gasTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: gas1.address}).call()).value0;
            const gasTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', gasTokenWalletAddress);
            const ownerTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: ownerWallet.address}).call()).value0;
            const ownerTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', ownerTokenWalletAddress);

            let transferPayload = (await locklift.provider.packIntoCell({
                structure: [
                    { name: 'chainIds', type: 'uint64[]' },
                    { name: 'amounts', type: 'uint256[]' },
                    { name: 'receivers', type: 'uint256[]' },
                ],
                data: {
                    chainIds: [chainIds[1]],
                    amounts: [value.toFixed()],
                    receivers: [(new bigInt(reveiverAddress.toString().substring(2), 16)).value.toString()],
                }
            })).boc;

            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: 0,
                    remainingGasTo: owner,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                })
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.equals(0);
            let eventGas = trace.traceTree?.findEventsForContract({
                contract: gas1,
                name: "InitiateTransferEvent",
            });
            expect(eventGas?.length).to.be.equals(1);
            let firstGasEvent1 = eventGas[0];
            expect(firstGasEvent1._dstChainId).to.be.equals(chainIds[1].toString());
            expect(firstGasEvent1._dstAddress).to.be.equals((new bigInt(gas2.address.toString().substring(2), 16)).value.toString());
            expect(firstGasEvent1._txId).to.be.equals('1');
            expect(firstGasEvent1._transferHash).to.be.not.empty;
            expect(firstGasEvent1._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                gas1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(firstGasEvent1._dstChainId),
                    _txId: parseInt(firstGasEvent1._txId),
                    _transferHash: firstGasEvent1._transferHash,
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
            expect(eventTr1?.length).to.be.equals(1);
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
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(gas1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(gas2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(firstGasEvent1._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(firstGasEvent1._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(firstGasEvent1._transferHash);
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
            let eventGas2 = trace.traceTree?.findEventsForContract({
                contract: gas2,
                name: "PayloadReceivedEvent",
            });
            expect(eventGas2?.length).to.be.equals(1);
            let firstGasEvent2 = eventGas2[0];
            expect(firstGasEvent2._srcChainId).to.be.equals(chainIds[0].toString());
            expect(firstGasEvent2._srcAddress).to.be.equals((new bigInt(gas1.address.toString().substring(2), 16)).value.toString());
            expect(firstGasEvent2._txId).to.be.equals(unpackPayload.data.txId);
            expect(firstGasEvent2._transferHash).to.be.equals(unpackPayload.data.transferHash);

            let gasUnpackPayload = await locklift.provider.unpackFromCell({
                structure: [
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'amount', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'tokenAddress', type: 'uint256' },
                    { name: 'decimals', type: 'uint8' },
                ],
                boc: firstGasEvent1._payload,
                allowPartial: true
            });
            let resultPayload = (await locklift.provider.packIntoCell({
                structure: [
                    { name: 'dstAddress', type: 'uint256' },
                    { name: 'amount', type: 'uint256' },
                    { name: 'txId', type: 'uint256' },
                    { name: 'tokenAddress', type: 'uint256' },
                    { name: 'decimals', type: 'uint8' },
                    { name: 'stableRate', type: 'uint256' },
                ],
                data: {
                    dstAddress: gasUnpackPayload.data.dstAddress,
                    amount: gasUnpackPayload.data.amount,
                    txId: gasUnpackPayload.data.txId,
                    tokenAddress: gasUnpackPayload.data.tokenAddress,
                    decimals: gasUnpackPayload.data.decimals,
                    stableRate: rate,
                }
            })).boc;
            trace = await locklift.tracing.trace(
                gas2.methods.asterizmClReceive({
                    _srcChainId: parseInt(firstGasEvent2._srcChainId),
                    _srcAddress: firstGasEvent2._srcAddress,
                    _txId: firstGasEvent2._txId,
                    _transferHash: firstGasEvent2._transferHash,
                    _payload: resultPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(asterizmClReceiveValue)
                })
            );
            let eventGas3 = trace.traceTree?.findEventsForContract({
                contract: gas2,
                name: "SuccessTransferExecutedEvent",
            });
            expect(eventGas3?.length).to.be.equals(1);
            expect(eventGas3[0]._transferHash).to.be.equals(firstGasEvent2._transferHash);
            let eventGas4 = trace.traceTree?.findEventsForContract({
                contract: gas2,
                name: "CoinsReceivedEvent",
            });
            expect(eventGas4?.length).to.be.equals(1);
            expect(eventGas4[0]._amount).to.be.equals(gasUnpackPayload.data.amount);
            expect(eventGas4[0]._transactionId).to.be.equals(gasUnpackPayload.data.txId);
            expect(eventGas4[0]._dstAddress.toString()).to.be.equals(reveiverAddress.toString());
        });

        it("Should not init transfer in source chain with wrong transferHash", async function () {
            let valueInUsd = 10;
            let value = BigNumber(valueInUsd).multipliedBy(pow);
            const reveiverAddress = ownerWallet.address;
            await locklift.giver.sendTo(gas2.address, locklift.utils.toNano(100));
            const ownerTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: ownerWallet.address}).call()).value0;
            const ownerTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', ownerTokenWalletAddress);

            let transferPayload = (await locklift.provider.packIntoCell({
                structure: [
                    { name: 'chainIds', type: 'uint64[]' },
                    { name: 'amounts', type: 'uint256[]' },
                    { name: 'receivers', type: 'uint256[]' },
                ],
                data: {
                    chainIds: [chainIds[1]],
                    amounts: [value.toFixed()],
                    receivers: [(new bigInt(reveiverAddress.toString().substring(2), 16)).value.toString()],
                }
            })).boc;

            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: 0,
                    remainingGasTo: owner,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                })
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.equals(0);
            let eventGas = trace.traceTree?.findEventsForContract({
                contract: gas1,
                name: "InitiateTransferEvent",
            });
            expect(eventGas?.length).to.be.equals(1);
            let firstGasEvent1 = eventGas[0];
            expect(firstGasEvent1._dstChainId).to.be.equals(chainIds[1].toString());
            expect(firstGasEvent1._dstAddress).to.be.equals((new bigInt(gas2.address.toString().substring(2), 16)).value.toString());
            expect(firstGasEvent1._txId).to.be.equals('2');
            expect(firstGasEvent1._transferHash).to.be.not.empty;
            expect(firstGasEvent1._payload).to.be.not.empty;

            let wrongHash = '1234567890';
            trace = await locklift.tracing.trace(
                gas1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(firstGasEvent1._dstChainId),
                    _txId: parseInt(firstGasEvent1._txId),
                    _transferHash: wrongHash,
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
        });

        it("Should not init transfer in source chain second times", async function () {
            let valueInUsd = 10;
            let value = BigNumber(valueInUsd).multipliedBy(pow);
            const reveiverAddress = ownerWallet.address;
            await locklift.giver.sendTo(gas2.address, locklift.utils.toNano(100));
            const ownerTokenWalletAddress = (await token.methods.walletOf({answerId: 0, walletOwner: ownerWallet.address}).call()).value0;
            const ownerTokenWallet = locklift.factory.getDeployedContract('AsterizmTestTokenWallet', ownerTokenWalletAddress);

            let transferPayload = (await locklift.provider.packIntoCell({
                structure: [
                    { name: 'chainIds', type: 'uint64[]' },
                    { name: 'amounts', type: 'uint256[]' },
                    { name: 'receivers', type: 'uint256[]' },
                ],
                data: {
                    chainIds: [chainIds[1]],
                    amounts: [value.toFixed()],
                    receivers: [(new bigInt(reveiverAddress.toString().substring(2), 16)).value.toString()],
                }
            })).boc;

            trace = await locklift.tracing.trace(
                ownerTokenWallet.methods.transfer({
                    amount: value.toFixed(),
                    recipient: gas1.address,
                    deployWalletValue: 0,
                    remainingGasTo: owner,
                    notify: true,
                    payload: transferPayload
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initTransferValue)
                })
            );
            expect(trace.traceTree?.getAllErrors().length).to.be.equals(0);
            let eventGas = trace.traceTree?.findEventsForContract({
                contract: gas1,
                name: "InitiateTransferEvent",
            });
            expect(eventGas?.length).to.be.equals(1);
            let firstGasEvent1 = eventGas[0];
            expect(firstGasEvent1._dstChainId).to.be.equals(chainIds[1].toString());
            expect(firstGasEvent1._dstAddress).to.be.equals((new bigInt(gas2.address.toString().substring(2), 16)).value.toString());
            expect(firstGasEvent1._txId).to.be.equals('3');
            expect(firstGasEvent1._transferHash).to.be.not.empty;
            expect(firstGasEvent1._payload).to.be.not.empty;

            trace = await locklift.tracing.trace(
                gas1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(firstGasEvent1._dstChainId),
                    _txId: parseInt(firstGasEvent1._txId),
                    _transferHash: firstGasEvent1._transferHash,
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
            expect(eventTr1?.length).to.be.equals(1);
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
            expect(unpackPayload.data.srcAddress).to.be.equals((new bigInt(gas1.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(chainIds[1].toString());
            expect(unpackPayload.data.dstAddress).to.be.equals((new bigInt(gas2.address.toString().substring(2), 16)).value.toString());
            expect(unpackPayload.data.dstChainId).to.be.equals(firstGasEvent1._dstChainId);
            expect(unpackPayload.data.txId).to.be.equals(firstGasEvent1._txId);
            expect(unpackPayload.data.notifyFlag).to.be.equals(true);
            expect(unpackPayload.data.transferHash).to.be.equals(firstGasEvent1._transferHash);
            
            trace = await locklift.tracing.trace(
                gas1.methods.initAsterizmTransfer({
                    _dstChainId: parseInt(firstGasEvent1._dstChainId),
                    _txId: parseInt(firstGasEvent1._txId),
                    _transferHash: firstGasEvent1._transferHash,
                    _transferFeeValue: 0
                }).send({
                    from: ownerWallet.address,
                    amount: locklift.utils.toNano(initAsterizmTransferValue)
                })
            );
            let gasErrorEvent = trace.traceTree?.findEventsForContract({
                contract: gas1,
                name: "ErrorTransferExecutedEvent",
            });
            expect(gasErrorEvent?.length).to.be.equals(1);
            expect(gasErrorEvent[0]._errorCode).to.be.equals('4006');
            expect(gasErrorEvent[0]._transferHash).to.be.equals(firstGasEvent1._transferHash);
        });

    });
});
