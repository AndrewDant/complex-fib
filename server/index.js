const keys = require('./keys');

// Express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// postgres client setup
const { Pool } = require('pg');
const pgClient = new Pool({
	user: keys.pgUser,
	host: keys.pgHost,
	database: keys.pgDatabase,
	password: keys.pgPassword,
	port: keys.pgPort
});

pgClient.on('connect', () => {
  pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log(err));
});

// Redis client setup
const redis = require('redis');
const redisClient = redisClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000
});

// in Redis listener clients should have no other job apparently
const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
	res.send('Hi');
})

app.get('/values/all', async (req, res) => {
	const values = await pgClient.query('SELECT * from values');

	res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
	redisClient.hgetall('values', (err, values) => {
		res.send(values);
	});
});

app.post('/values', async (req, res) => {
	const index = req.body.index;
	const MAX_ALLOWED_INDEX = 40;

	if (parseInt(index) > MAX_ALLOWED_INDEX) {
		return res.status(422).send('Index too high');
	}

	redisClient.hset('values', index, 'Nothing yet!');
	redisPublisher.publish('insert', index);
	pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

	res.send({ working: true });
});

app.listen(5000, err => {
	console.log('listening on 5000');
});
