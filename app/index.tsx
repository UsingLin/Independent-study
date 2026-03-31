import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, Switch } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DetectedObject {
  id: number;
  label: string;
  x: number; y: number; w: number; h: number;
  ttc: number;
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [speed, setSpeed] = useState<number>(0);
  const [isTestMode, setIsTestMode] = useState(false); // 切換測試模式
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isRecording, setIsRecording] = useState(true); // 模擬錄影紅點
  const testInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 錄影點閃爍效果
    const blink = setInterval(() => setIsRecording(prev => !prev), 1000);
    
    (async () => {
      await requestPermission();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation }, (loc) => {
          setSpeed(loc.coords.speed && loc.coords.speed > 0 ? loc.coords.speed : 0);
        });
      }
    })();
    return () => clearInterval(blink);
  }, []);

  // 測試模式邏輯：模擬隨機出現的物件 [cite: 8, 9]
  useEffect(() => {
    if (isTestMode) {
      testInterval.current = setInterval(() => {
        const fakeData: DetectedObject[] = [
          { id: 1, label: 'Car', x: 0.2, y: 0.4, w: 0.3, h: 0.2, ttc: Math.random() * 6 },
          { id: 2, label: 'Pedestrian', x: 0.7, y: 0.3, w: 0.1, h: 0.5, ttc: 8 }
        ];
        setDetectedObjects(fakeData);
        // 若有高危險物件則震動 [cite: 4, 7]
        if (fakeData.some(o => o.ttc < 2)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }, 1000);
    } else {
      if (testInterval.current) clearInterval(testInterval.current);
      setDetectedObjects([]);
    }
    return () => { if (testInterval.current) clearInterval(testInterval.current); };
  }, [isTestMode]);

  if (!permission?.granted) return <View style={styles.center}><TouchableOpacity onPress={requestPermission} style={styles.btn}><Text style={{color:'white'}}>取得權限</Text></TouchableOpacity></View>;

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back">
        
        {/* AR 繪圖層：座標轉換與顏色編碼 [cite: 3, 16, 17] */}
        {detectedObjects.map((obj) => (
          <View key={obj.id} style={[styles.boundingBox, {
            left: obj.x * SCREEN_WIDTH,
            top: obj.y * SCREEN_HEIGHT,
            width: obj.w * SCREEN_WIDTH,
            height: obj.h * SCREEN_HEIGHT,
            borderColor: obj.ttc < 2 ? '#FF3B30' : '#4CD964',
            borderWidth: obj.ttc < 2 ? 4 : 2,
          }]}>
            <View style={[styles.labelTag, { backgroundColor: obj.ttc < 2 ? '#FF3B30' : '#4CD964' }]}>
              <Text style={styles.labelText}>{obj.label} | {obj.ttc.toFixed(1)}s</Text>
            </View>
          </View>
        ))}

        {/* 頂部資訊列  */}
        <View style={styles.header}>
          <View style={styles.row}>
            <View style={[styles.dot, { opacity: isRecording ? 1 : 0 }]} />
            <Text style={styles.headerText}>REC LIVE</Text>
          </View>
          <Text style={styles.speedText}>{(speed * 3.6).toFixed(0)} <Text style={{fontSize: 14}}>km/h</Text></Text>
        </View>

        {/* 底部控制面板 */}
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text style={{color: 'white', marginRight: 10}}>模擬測試模式</Text>
            <Switch value={isTestMode} onValueChange={setIsTestMode} trackColor={{ false: "#767577", true: "#4CD964" }} />
          </View>
          <Text style={styles.hint}>模式：{isTestMode ? "DEBUG 模擬中" : "待命對接大腦..."}</Text>
        </View>

      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10 },
  header: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  speedText: { color: 'white', fontSize: 42, fontWeight: '900', textShadowColor: 'black', textShadowRadius: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'red', marginRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  boundingBox: { position: 'absolute' },
  labelTag: { position: 'absolute', top: -20, left: -2, paddingHorizontal: 6, paddingVertical: 2 },
  labelText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 20, alignItems: 'center' },
  hint: { color: '#AAA', fontSize: 12, marginTop: 5 }
});