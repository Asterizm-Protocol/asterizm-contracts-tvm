import {Address} from "locklift";

async function main() {
  const signer = (await locklift.keystore.getSigner("0"))!;
  let translatonAddress;
  translatonAddress = new Address("0:d38d1c9542ff99ba86ae294d792cd33f47c0e0c58b5bf1eb7e30fbfe61bb3b2f");
  if (!translatonAddress) {
    const { contract: translator } = await locklift.factory.deployContract({
      contract: "AsterizmTranslator",
      publicKey: signer.publicKey,
      initParams: {
        // _nonce: locklift.utils.getRandomNonce(),
      },
      constructorParams: {
        _localChainId: 1,
      },
      value: locklift.utils.toNano(1.5),
    });
    translatonAddress = translator.address;
  }
  console.log(`Translator deployed at: ${translatonAddress.toString()}`);

  let initializerAddress;
  initializerAddress = new Address("0:812e4e4b52f155daebfcefb54be29c59739b3bede3a9069b2abcaadd5e58c32c");
  if (!initializerAddress) {
    const { contract: initializer } = await locklift.factory.deployContract({
      contract: "AsterizmInitializer",
      publicKey: signer.publicKey,
      initParams: {
        // _nonce: locklift.utils.getRandomNonce(),
      },
      constructorParams: {
        _translatorLibrary: translatonAddress,
      },
      value: locklift.utils.toNano(1.5),
    });
    initializerAddress = initializer.address;
  }
  console.log(`Initializer deployed at: ${initializerAddress.toString()}`);

  // const { contract: gas } = await locklift.factory.deployContract({
  //   contract: "GasStation",
  //   publicKey: signer.publicKey,
  //   initParams: {
  //     // _nonce: locklift.utils.getRandomNonce(),
  //   },
  //   constructorParams: {
  //     _initializerLib: initializerAddress,
  //   },
  //   value: locklift.utils.toNano(2),
  // });
  // console.log(`Gas deployed at: ${gas.address.toString()}`);

  const { contract: demo } = await locklift.factory.deployContract({
    contract: "AsterizmDemo",
    publicKey: signer.publicKey,
    initParams: {
      // _nonce: locklift.utils.getRandomNonce(),
    },
    constructorParams: {
      _initializerLib: initializerAddress,
    },
    value: locklift.utils.toNano(2),
  });
  console.log(`Demo deployed at: ${demo.address.toString()}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.log(e);
    console.log(e.transaction.transaction.inMessage);
    process.exit(1);
  });
