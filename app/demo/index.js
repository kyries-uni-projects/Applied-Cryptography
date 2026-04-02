const forge = require("node-forge");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const readline = require("readline");
const assert = require("assert");
const util = require("util");

const certPath = path.resolve(__dirname, "certificate.pem");
const privPath = path.resolve(__dirname, "private-key.pem");
const publicPath = path.resolve(__dirname, "public-key.pem");
const testPath = path.resolve(__dirname, "data.txt");
const signedPath = path.resolve(__dirname, "signed.bin");

console.log("Cleaning up test files...");
try {
	fs.unlinkSync(testPath);
	fs.unlinkSync(signedPath);
	fs.unlinkSync(certPath);
	fs.unlinkSync(privPath);
	fs.unlinkSync(publicPath);
} catch (err) {
	if (err.code !== "ENOENT") {
		throw err;
	}
}
console.log("Test files cleaned up!");

function generateCertificate(bits) {
	console.log("Generating certificate and keys...");

	const keys = forge.pki.rsa.generateKeyPair(bits);

	const cert = forge.pki.createCertificate();
	cert.publicKey = keys.publicKey;
	cert.serialNumber = "01";

	cert.validity.notBefore = new Date();
	cert.validity.notAfter = new Date();
	cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

	const attrs = [
		{ name: "commonName", value: "example.org" },
		{ name: "countryName", value: "VN" },
		{ shortName: "ST", value: "Ho Chi Minh" },
		{ name: "localityName", value: "Cay Sop" },
		{ name: "organizationName", value: "My Company" },
	];

	cert.setSubject(attrs);
	cert.setIssuer(attrs);

	cert.setExtensions([
		{ name: "basicConstraints", cA: true },
		{ name: "keyUsage", keyCertSign: true, digitalSignature: true },
		{ name: "extKeyUsage", serverAuth: true, clientAuth: true },
		{
			name: "subjectAltName",
			altNames: [
				{ type: 2, value: "example.org" }, // DNS
				{ type: 7, ip: "127.0.0.1" }, // IP
			],
		},
	]);

	cert.sign(keys.privateKey);

	const certPem = forge.pki.certificateToPem(cert);
	const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
	const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);

	fs.writeFileSync(certPath, certPem);
	fs.writeFileSync(privPath, privateKeyPem);
	fs.writeFileSync(publicPath, publicKeyPem);

	console.log("Certificate and keys saved!");

	console.log("Test 1: Verifying certificate with OpenSSL...");
	assert.doesNotThrow(() => {
		childProcess.execSync(`openssl x509 -in "${certPath}" -text -noout`, { stdio: "inherit" });
	}, "Certificate verification failed!");
	console.log("\n");

	console.log("Test 2: Verifying private key with OpenSSL...");
	assert.doesNotThrow(() => {
		childProcess.execSync(`openssl rsa -in "${privPath}" -text -noout`, { stdio: "inherit" });
	}, "Private key verification failed!");
	console.log("\n");

	console.log("Test 3: Comparing modulus...");
	const certHash = childProcess.execSync(`openssl x509 -noout -modulus -in "${certPath}" | openssl md5`).toString();
	const privHash = childProcess.execSync(`openssl rsa -noout -modulus -in "${privPath}" | openssl md5`).toString();

	console.log("Certificate modulus hash:", certHash);
	console.log("Private key modulus hash:", privHash);
	assert.strictEqual(certHash, privHash, "Modulus does not match!");
	console.log("Modulus matches!");
	console.log("\n");

	console.log("Test 4: Verifying certificate with private key with OpenSSL...");

	console.log("4.1. Preparing test data:");

	fs.writeFileSync(testPath, "Hello OpenSSL!");
	childProcess.execSync(`openssl pkeyutl -inkey "${privPath}" -sign -in "${testPath}" -out "${signedPath}"`, {
		stdio: "inherit",
	});
	console.log("Test data:", fs.readFileSync(testPath, "utf-8"));
	console.log("Signed data:", fs.readFileSync(signedPath));
	console.log("\n");

	console.log("4.2. Verifying signed data with public key:");
	childProcess.execSync(`openssl pkeyutl -verify -pubin -inkey "${publicPath}" -sigfile "${signedPath}" -in "${testPath}"`, {
		stdio: "inherit",
	});
	console.log("\n");
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question("Enter RSA bit size (default: 2048): ", (answer) => {
	rl.close();
	let bits;
	try {
		bits = parseInt(answer);
		if (isNaN(bits)) {
			throw new Error();
		}
	} catch (err) {
		console.warn("Invalid input, using default value: 2048");
		bits = 2048;
	}
	generateCertificate(bits);
});
