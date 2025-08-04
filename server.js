import express from 'express';

const app = express();

const port = 5002;

app.get('/', (req, res) => {
    res.send('Welcome to Resource Catalog');
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});