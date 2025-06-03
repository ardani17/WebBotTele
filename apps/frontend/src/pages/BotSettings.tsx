export function BotSettings() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bot Settings</h1>
      
      <div className="space-y-6">
        {/* Bot Status */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Bot Status
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Your bot is currently running with polling mode
                </p>
                <div className="mt-2 flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm font-medium text-green-600">Online</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Stop Bot
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Restart Bot
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bot Configuration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Bot Configuration
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bot Token
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter your bot token"
                    defaultValue="123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bot Username
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="@your_bot_username"
                    defaultValue="@my_telegram_bot"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Polling Interval (seconds)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="30"
                    defaultValue="30"
                    min="1"
                    max="300"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Connections
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="100"
                    defaultValue="100"
                    min="1"
                    max="1000"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Save Configuration
              </button>
            </div>
          </div>
        </div>

        {/* Commands Configuration */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Bot Commands
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">/start</h4>
                  <p className="text-sm text-gray-500">Welcome message for new users</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">/location</h4>
                  <p className="text-sm text-gray-500">Handle location sharing</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">/workbook</h4>
                  <p className="text-sm text-gray-500">Workbook management features</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">/help</h4>
                  <p className="text-sm text-gray-500">Show available commands</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                  <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Add New Command
              </button>
            </div>
          </div>
        </div>

        {/* Polling vs Webhook */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Connection Method
            </h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="polling"
                  name="connection-method"
                  type="radio"
                  defaultChecked
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <label htmlFor="polling" className="ml-3 block text-sm font-medium text-gray-700">
                  Polling (Recommended for development)
                </label>
              </div>
              <p className="ml-7 text-sm text-gray-500">
                Bot actively checks for new messages. Easier to set up but uses more resources.
              </p>
              
              <div className="flex items-center">
                <input
                  id="webhook"
                  name="connection-method"
                  type="radio"
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                />
                <label htmlFor="webhook" className="ml-3 block text-sm font-medium text-gray-700">
                  Webhook (Recommended for production)
                </label>
              </div>
              <p className="ml-7 text-sm text-gray-500">
                Telegram sends messages to your server. More efficient but requires HTTPS.
              </p>
            </div>
            
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Update Connection Method
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
