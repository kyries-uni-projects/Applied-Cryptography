function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`${name} is required`);
	}

	return value;
}

export const MASTER_KEY = requireEnv("CA_SECRET_PASSPHRASE");