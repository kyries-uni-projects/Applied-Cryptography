const forge = require("node-forge");
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");
const readline = require("readline");
const assert = require("assert");

// 1. Generate key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// 2. Create certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = "01";

// Validity
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Subject & issuer (self-signed)
const attrs = [
	{ name: "commonName", value: "example.org" },
	{ name: "countryName", value: "VN" },
	{ shortName: "ST", value: "Ho Chi Minh" },
	{ name: "localityName", value: "Cay Sop" },
	{ name: "organizationName", value: "My Company" },
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Extensions (important for real usage)
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

// 3. Self-sign certificate
cert.sign(keys.privateKey);

// 4. Convert to PEM
const certPem = forge.pki.certificateToPem(cert);
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);

// 5. Write to files
const certPath = path.resolve(__dirname, "certificate.pem");
const privPath = path.resolve(__dirname, "private-key.pem");
const publicPath = path.resolve(__dirname, "public-key.pem");

fs.writeFileSync(certPath, certPem);
fs.writeFileSync(privPath, privateKeyPem);
fs.writeFileSync(publicPath, publicKeyPem);

console.log("✅ Certificate and keys saved!");

// Verify with OpenSSL (external)
console.log("Test 1: Verifying certificate with OpenSSL...");
childProcess.execSync(`openssl x509 -in "${certPath}" -text -noout`, { stdio: "inherit" });
console.log("\n");

console.log("Test 2: Verifying private key with OpenSSL...");
childProcess.execSync(`openssl rsa -in "${privPath}" -text -noout`, { stdio: "inherit" });
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
const testPath = path.resolve(__dirname, "data.txt");
const signedPath = path.resolve(__dirname, "signed.bin");

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

// Clean up test data
function cleanUp(answer) {
	fs.unlinkSync(testPath);
	fs.unlinkSync(signedPath);
	fs.unlinkSync(certPath);
	fs.unlinkSync(privPath);
	fs.unlinkSync(publicPath);
	console.log("Test files cleaned up!");
}

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});
rl.question("Do you want to clean up test files? (y/N) ", (answer) => {
	rl.close();
	if (answer.toLowerCase() === "y") {
		cleanUp(answer);
		return;
	}
});
