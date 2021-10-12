const puppeteer = require("puppeteer");
const fs = require("fs");
const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
(async () => {
    try {
        await initProcess();
        alertProcess("Fim da execução!");
        process.exit(0);
    } catch (err) {
        console.log(err);
        process.exit(0);
    }
})();

async function initProcess() {
    const color = await getUserColor();
    const page = await preparePage(color);
    const colors = await getColors(page);
    await createFiles(color, colors);
    alertProcess("Processo finalizado!");
    await tryAgain();
}

async function getUserColor() {
    let color = await question(
        "Qual cor você deseja escolher? (Digite 'exit' para sair)"
    );
    if (color == "exit") {
        process.exit();
    }
    if (color[0] == "#") {
        color = color.substring(1);
    }
    if (!/^[a-f0-9]{6}$/.test(color)) {
        alertError("Por favor, insira uma cor válida!");
        return await getUserColor();
    }
    alertProcess(`Continuando processo com a cor #${color}`);
    return color;
}

async function preparePage(color) {
    alertProgress("Preparação da página");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`https://mycolor.space/?hex=%23${color}&sub=1`);
    return page;
}

async function getColors(page) {
    alertProgress("Busca pelas cores");
    await page.waitForSelector("body > div.palettes > div");
    const colors = await page.evaluate(() => {
        let pallets = document.querySelectorAll(
            "body > div.palettes > div > div"
        );
        let colorPallets = [];
        let colors = [];
        pallets.forEach((pallet) => {
            const title = pallet.querySelector("h2").textContent;
            let colorsOfPallet = [];
            for (
                let i = 0;
                i < pallet.querySelector("div").children.length;
                i++
            ) {
                let colorOfPallet = pallet.querySelector(
                    `div > div:nth-child(${i + 1}) > input`
                ).value;
                colorsOfPallet.push(colorOfPallet);
                colors.push(colorOfPallet);
            }
            colorPallets.push({
                title,
                colorsOfPallet,
            });
        });
        return { colorPallets, colors };
    });
    return colors;
}

async function createFiles(color, colors) {
    alertProgress("Criação dos arquivos");
    let dir = `./colors`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    dir = `./colors/${color}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    await new Promise((resolve, reject) => {
        let colorPalletsFile = fs.createWriteStream(`${dir}/Pallets.txt`);
        colorPalletsFile.on("error", function (err) {
            alertError("Houve um erro ao criar o arquivo de paletas!");
            process.exit(0);
        });
        colorPalletsFile.on("finish", resolve);
        colors.colorPallets.forEach(function (colorPallet) {
            colorPalletsFile.write(`${colorPallet.title}: \n`);
            colorPallet.colorsOfPallet.forEach((_color) => {
                colorPalletsFile.write(` --- ${_color}, \n`);
            });
            colorPalletsFile.write(`\n`);
        });
        colorPalletsFile.end();
    });

    await new Promise((resolve, reject) => {
        let colorsFile = fs.createWriteStream(`${dir}/Colors.txt`);
        colorsFile.on("error", function (err) {
            alertError("Houve um erro ao criar o arquivo de paletas!");
            process.exit(0);
        });
        colorsFile.on("finish", resolve);
        colors.colors.forEach(function (_color) {
            colorsFile.write(`${_color}, \n`);
        });
        colorsFile.end();
    });
}

async function tryAgain() {
    const retry = await question("Gostaria de buscar uma nova cor? (sim|nao)");
    if (retry == "sim") {
        await initProcess();
    }
}

function alertProgress(stage) {
    console.log("\n---Estágio avançado para------------");
    console.log(stage);
    console.log("------------------------------------");
}

function alertProcess(message) {
    console.log("\n-------------Aviso------------------");
    console.log(message);
    console.log("------------------------------------");
}

function alertError(err) {
    console.log("\n--------------Erro-------------------");
    console.log(err);
    console.log("------------------------------------");
}

async function question(questionText) {
    return await new Promise(function (resolve, reject) {
        try {
            rl.question(questionText + "\n", (userInput) => {
                resolve(userInput);
            });
        } catch (err) {
            reject(err);
        }
    });
}
