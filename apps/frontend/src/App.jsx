import { useState, useRef } from "react";
import { ethers } from "ethers";
import usdcAbi from './contracts/usdc.json';

const usdcAddress = import.meta.env.VITE_ARB_SEPOLIA_USDC;

const App = () => {
  const providerRef = useRef(null);
  const [testator, setTestator] = useState(null);
  const [executor, setExecutor] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [value, setValue] = useState("");
  const [deadline, setDeadline] = useState("");
  const [usdcContract, setUsdcContract] = useState(null);

  const loadProvider = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        providerRef.current = provider;

        const signer = await provider.getSigner();
        setTestator(await signer.getAddress());

        const usdcContract = new ethers.Contract(
          usdcAddress,
          usdcAbi,
          signer
        );
        setUsdcContract(usdcContract);
      } catch (error) {
        console.error("Provider initialization failed:", error);
      }
    } else {
      console.error("MetaMask not detected");
    }
  };

  const handlePermit = async () => {
    if (!providerRef.current || !testator || !usdcContract) {
      console.error("Required components not initialized");
      return;
    }

    try {
      const provider = providerRef.current;
      const signer = await provider.getSigner();

      const valueInUnits = ethers.parseUnits(value, 6);

      const nonce = await usdcContract.nonces(testator);
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + (parseInt(deadline)) || 3600; // Default 1 hour

      const domain = {
        name: await usdcContract.name(),
        version: "1",
        chainId: (await provider.getNetwork()).chainId,
        verifyingContract: usdcAddress,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };

      const signature = await signer.signTypedData(domain, types, {
        owner: testator,
        spender: executor,
        value: valueInUnits.toString(),
        nonce: nonce.toString(),
        deadline: deadlineTimestamp.toString()
      });

      const response = await fetch("http://localhost:4000/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner: testator,
          spender: executor,
          receiver: beneficiary,
          value: valueInUnits.toString(),
          nonce: nonce.toString(),
          deadline: deadlineTimestamp.toString(),
          signature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Request failed");
      }

      const data = await response.json();
      console.log("Transaction result:", data);
      alert("Permit successfully executed!");

    } catch (error) {
      console.error("Permit process failed:", error);
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>ERC20 Permit Demo</h1>
      <button onClick={loadProvider}>
        {testator ? `Testator Address: ${testator}` : "Connect Wallet"}
      </button>

      <div>
        <input
          type="text"
          placeholder="Executor Address"
          value={executor}
          onChange={(e) => setExecutor(e.target.value)}
        />
        <input
          type="text"
          placeholder="Beneficiary Address"
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
        />
        <input
          type="number"
          placeholder="Value (in USDC)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <input
          type="number"
          placeholder="Deadline (in seconds)"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <button onClick={handlePermit} disabled={!testator}>
          Sign and Send Permit
        </button>
      </div>
    </div>
  );
};

export default App;