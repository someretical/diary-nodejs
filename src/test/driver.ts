/* eslint-disable no-console */
import { main as drive } from './drive';
import { main as encryption } from './encryption';

/**
 * driver function to run all the tests
 */
const main = async () => {
	console.log('running encryption() ...');
	await encryption();

	console.log('running drive() ...');
	drive();
};

main();

process.on('unhandledRejection', reason => {
	console.log(reason);
});
