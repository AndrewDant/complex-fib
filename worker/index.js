const keys = require('./keys');
const redis = require('redis');

const redisClient = redisClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 1000
});
const sub = redisClient.duplicate();

function fib(index) {
	if (index < 2) return 1;

	// intentional use of a slow method
	return fib(index - 1) + fib(index - 2);
}

sub.on('message', (channel, message) => {
	redisClient.hset('values', message, fib(parseInt(message)));
});
sub.subscribe('insert');