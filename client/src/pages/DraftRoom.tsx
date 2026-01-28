import { useParams } from 'react-router-dom';

export default function DraftRoom() {
  const { draftId } = useParams();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2">Draft Room</h1>
          <p className="text-gray-600">Draft ID: {draftId}</p>
          <p className="text-gray-500 mt-4">Draft room interface coming soon...</p>
        </div>
      </div>
    </div>
  );
}