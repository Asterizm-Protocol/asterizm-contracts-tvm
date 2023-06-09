export const parseArgs = (args: any) => {
    const parsedArgs = {};

    for (let i = 0; i < args.length; i++) {
        parsedArgs[args[i].replace(/[-]/g, '')] = args[i + 1];
        i++;
    }
  
    return parsedArgs;
  };