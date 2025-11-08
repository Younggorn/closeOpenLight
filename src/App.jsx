import { useState, useRef } from 'react';
import { Mic, Square, AlertCircle, CheckCircle } from 'lucide-react';

export default function SpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('th-TH');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const recognitionRef = useRef(null);

  // ข้อมูล Room
   const rooms = {
    11: 'ไฟโถงกลาง',
    42: 'ชั้นล่างหน้า 1',
    41: 'ชั้นล่างหน้า 2',
    38: 'ชั้นล่างหน้า 3',
    43: 'ชั้นล่างหลัง 1',
    44: 'ชั้นล่างหลัง 2',
    45: 'ชั้นล่างหลัง 3',
    1: 'Store 3',
    2: 'Store 2',
    3: 'Store 1'
  };


  // สร้าง mapping ชื่อ -> room id
  const nameToRoom = {};
  Object.entries(rooms).forEach(([roomId, name]) => {
    nameToRoom[name.toLowerCase()] = roomId;
  });

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatus('ขออภัย เบราว์เซอร์ของคุณไม่รองรับฟีเจอร์นี้');
      setStatusType('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus('🎤 กำลังฟังอยู่...');
      setStatusType('loading');
      setTranscript('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          setTranscript(prev => prev + transcript + ' ');
          
          // ตรวจสอบว่าพูด "จาร์วิส" ก่อน
          if (transcript.toLowerCase().includes('จาร์วิส')) {
            processCommand(transcript);
          }
        } else {
          interimTranscript += transcript;
        }
      }

      // แสดงข้อความแบบ Real-time
      if (interimTranscript) {
        setStatus('🎤 ' + interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      setStatus('❌ เกิดข้อผิดพลาด: ' + event.error);
      setStatusType('error');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processCommand = (text) => {
    const lowerText = text.toLowerCase();
    let action = null;
    let roomName = null;

    // ตรวจสอบคำสั่ง "เปิดทั้งหมด" หรือ "ปิดทั้งหมด"
    if (lowerText.includes('เปิดทั้งหมด')) {
      action = 'on';
      roomName = 'ทั้งหมด';
    } else if (lowerText.includes('ปิดทั้งหมด')) {
      action = 'off';
      roomName = 'ทั้งหมด';
    } else if (lowerText.includes('เปิด')) {
      action = 'on';
    } else if (lowerText.includes('ปิด')) {
      action = 'off';
    }

    if (!action) {
      setStatus('❌ ไม่เข้าใจคำสั่ง พูด "จาร์วิส เปิด/ปิด [ชื่อที่]"');
      setStatusType('error');
      return;
    }

    // หากเป็นคำสั่ง "ทั้งหมด" ให้ทำการ control ทั้งหมด
    if (roomName === 'ทั้งหมด') {
      callApiAll(action, roomName);
      return;
    }

    // ค้นหาชื่อที่ตรงกัน
    for (const name of Object.keys(nameToRoom)) {
      if (lowerText.includes(name)) {
        roomName = name;
        break;
      }
    }

    if (!roomName) {
      const roomList = Object.values(rooms).join(', ');
      setStatus(`❌ ไม่เจอชื่อที่ตรงกัน ชื่อที่มี: ${roomList}`);
      setStatusType('error');
      return;
    }

    const roomId = nameToRoom[roomName];
    callApi(action, roomId, roomName);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const callApi = async (action, roomId, roomName) => {
    try {
      const actionText = action === 'on' ? 'เปิด' : 'ปิด';
      setStatus(`⚡ ส่งคำสั่ง${actionText} ${roomName}...`);
      setStatusType('loading');

      const url = `http://10.1.9.88/s/runtask.php?type=${action}&room=${roomId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors'
      });

      setStatus(`✅ ${actionText} ${roomName} สำเร็จ!`);
      setStatusType('success');
      
      setTimeout(() => {
        setStatus('');
        setTranscript('');
      }, 2000);
    } catch (error) {
      setStatus('❌ เกิดข้อผิดพลาด: ' + error.message);
      setStatusType('error');
    }
  };

  const callApiAll = async (action, roomName) => {
    try {
      const actionText = action === 'on' ? 'เปิด' : 'ปิด';
      setStatus(`⚡ ส่งคำสั่ง${actionText} ${roomName}...`);
      setStatusType('loading');

      // ส่ง API ไปยังทั้งหมด
      const roomIds = Object.keys(rooms);
      const promises = roomIds.map(roomId =>
        fetch(`http://10.1.9.88/s/runtask.php?type=${action}&room=${roomId}`, {
          method: 'GET',
          mode: 'no-cors'
        })
      );

      await Promise.all(promises);

      setStatus(`✅ ${actionText} ${roomName} สำเร็จ! (${roomIds.length} ที่)`);
      setStatusType('success');
      
      setTimeout(() => {
        setStatus('');
        setTranscript('');
      }, 2000);
    } catch (error) {
      setStatus('❌ เกิดข้อผิดพลาด: ' + error.message);
      setStatusType('error');
    }
  };

  const roomList = Object.entries(rooms).map(([id, name]) => `${id}: ${name}`).join(' | ');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            🎙️ จาร์วิส - ควบคุมไฟด้วยเสียง
          </h1>
          <p className="text-center text-gray-600 mb-8">พูด: "จาร์วิส [เปิด/ปิด] [ชื่อที่]"</p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกภาษา
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isListening}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="th-TH">ไทย</option>
              <option value="en-US">English</option>
            </select>
          </div>

          {status && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-lg font-semibold ${
              statusType === 'success' ? 'bg-green-100 text-green-800 border-2 border-green-400' :
              statusType === 'error' ? 'bg-red-100 text-red-800 border-2 border-red-400' :
              'bg-blue-100 text-blue-800 border-2 border-blue-400'
            }`}>
              {statusType === 'error' && <AlertCircle size={28} />}
              {statusType === 'success' && <CheckCircle size={28} />}
              {statusType === 'loading' && <div className="animate-spin text-2xl">⟳</div>}
              {status}
            </div>
          )}

          {transcript && (
            <div className="mb-6 p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
              <p className="text-sm text-gray-600 mb-1">📝 ข้อความที่บันทึก:</p>
              <p className="text-lg font-semibold text-gray-800">{transcript}</p>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            {!isListening ? (
              <button
                onClick={startListening}
                className="flex-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-3 text-lg shadow-lg"
              >
                <Mic size={28} />
                เริ่มบันทึก
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-3 text-lg shadow-lg animate-pulse"
              >
                <Square size={28} />
                หยุดบันทึก
              </button>
            )}
          </div>

          <div className="mb-6 p-5 bg-green-50 rounded-lg border-2 border-green-300">
            <p className="text-sm text-gray-700 font-semibold mb-3">
              ✨ วิธีใช้:
            </p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>1. คลิก "เริ่มบันทึก"</li>
              <li>2. พูด: "จาร์วิส เปิด ไฟโถงกลาง" หรือ "จาร์วิส ปิด สโต1"</li>
              <li>3. พูด: "จาร์วิส เปิดทั้งหมด" หรือ "จาร์วิส ปิดทั้งหมด" (ควบคุมทั้งหมด)</li>
              <li>4. ระบบจะส่ง API โดยอัตโนมัติ</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-700 font-semibold mb-2">
              📍 ชื่อที่ที่รองรับ:
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              {Object.entries(rooms).map(([id, name]) => (
                <div key={id}>
                  <span className="font-semibold">{name}</span> (Room {id})
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs text-gray-700">
              <strong>💡 ตัวอย่าง:</strong>
            </p>
            <p className="text-xs text-gray-600 mt-1">• "จาร์วิส เปิด ไฟโถงกลาง"</p>
            <p className="text-xs text-gray-600">• "จาร์วิส ปิด ชั้นล่างหลัง1"</p>
            <p className="text-xs text-gray-600">• "จาร์วิส เปิด สโต2"</p>
            <p className="text-xs text-gray-600">• "จาร์วิส เปิดทั้งหมด"</p>
            <p className="text-xs text-gray-600">• "จาร์วิส ปิดทั้งหมด"</p>
          </div>
        </div>
      </div>
    </div>
);
}