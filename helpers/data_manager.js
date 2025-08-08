import * as fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const readData = async (fileName) => {
    const filePath = path.join(__dirname, '../data', fileName);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    const data = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(data);
};


export const writeData = async (fileName, data) => {
    const filePath = path.join(__dirname, '../data', fileName);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const jsonData = JSON.stringify(data, null, 2);
    await fsp.writeFile(filePath, jsonData, 'utf-8');
};