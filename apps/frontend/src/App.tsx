// import { useState } from 'react'
// import { formatAddress } from '@shared/utils/'
// import { NETWORKS } from '@shared/constants'
// import type { Testament } from '@shared/types'

// function App() {
//   const [count, setCount] = useState(0)

//   const mockTestament: Testament = {
//     id: '1',
//     owner: '0x1234567890123456789012345678901234567890',
//     beneficiaries: [],
//     content: 'Sample testament',
//     encrypted: false,
//     timestamp: Date.now()
//   }

//   return (
//     <div className="App">
//       <h1>Testament Project</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Testing shared utilities: {formatAddress(mockTestament.owner)}
//         </p>
//         <p>
//           Available networks: {Object.keys(NETWORKS).join(', ')}
//         </p>
//         <p>
//           Testament ID: {mockTestament.id}
//         </p>
//       </div>
//     </div>
//   )
// }

// export default App
