// import { useState } from 'react'
// import { formatAddress } from '@shared/utils/'
// import { NETWORKS } from '@shared/constants'
// import type { Will } from '@shared/types'

// function App() {
//   const [count, setCount] = useState(0)

//   const mockWill: Will = {
//     id: '1',
//     owner: '0x1234567890123456789012345678901234567890',
//     beneficiaries: [],
//     content: 'Sample will',
//     encrypted: false,
//     timestamp: Date.now()
//   }

//   return (
//     <div className="App">
//       <h1>Will Project</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Testing shared utilities: {formatAddress(mockWill.owner)}
//         </p>
//         <p>
//           Available networks: {Object.keys(NETWORKS).join(', ')}
//         </p>
//         <p>
//           Will ID: {mockWill.id}
//         </p>
//       </div>
//     </div>
//   )
// }

// export default App
