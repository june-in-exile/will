import { WitnessTester } from "./witnessTester.js";

export default async function globalSetup() {
  WitnessTester.initializeConstraints();
}