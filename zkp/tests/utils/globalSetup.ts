import { WitnessTester } from ".";

export default async function globalSetup() {
  WitnessTester.initializeConstraints();
}
