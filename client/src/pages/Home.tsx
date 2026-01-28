export default function Home() {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
          <h1 className="text-4xl font-bold mb-2 text-gray-800">Mock Draft</h1>
          <p className="text-gray-600 mb-6">Create or join a draft to get started</p>
          
          <div className="space-y-4">
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Create New Draft
            </button>
            
            <div className="text-center text-gray-500">or</div>
            
            <input 
              type="text" 
              placeholder="Enter Draft ID"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition">
              Join Draft
            </button>
          </div>
        </div>
      </div>
    );
  }