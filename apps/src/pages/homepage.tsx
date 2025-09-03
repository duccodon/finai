import ChatPanel from '@/components/chat/ChatPanel';
import { SingleChartView } from '@/pages/SingleChartView';
import { MultiChartView } from './MultiChartView';
import React, { useState } from 'react';
function App() {
  const [isMultiChartView, setIsMultiChartView] = useState(false);
  return (
    <>
      {/* <ChatPanel /> */}
      {isMultiChartView ? (
        <MultiChartView
          onSwitchToSingleView={() => setIsMultiChartView(false)}
        />
      ) : (
        <SingleChartView
          onSwitchToMultiView={() => setIsMultiChartView(true)}
        />
      )}
    </>
  );
}

export default App;
