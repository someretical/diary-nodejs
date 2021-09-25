/* eslint-disable no-console */
import drive from './drive';
import encryption from './encryption';

/**
 * Driver function to run all the tests
 */
const main = async () => {
	const pwd = 'abc123';

	console.log('Running encryption()...');
	await encryption(pwd);

	console.log('Running drive()...');
	drive();
};

main();

process.on('unhandledRejection', reason => {
	console.log(reason);
});
