const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');
const { recommendWithRelaxation } = require('./recommend');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// multer 設定（部屋画像アップロード用）
const projectRoot = path.join(__dirname, '..');
const uploadDir = path.join(projectRoot, 'images', 'rooms', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || '.png';
        const uniqueName = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('許可されていないファイル形式です。JPEG, PNG, WebPのみ対応しています。'));
        }
    },
});

// 静的ファイル配信
app.use(express.static(path.join(projectRoot, 'src')));
app.use('/src', express.static(path.join(projectRoot, 'src')));
app.use('/images', express.static(path.join(projectRoot, 'images')));

// データ読込（ソファDB / 質問定義）
const dataDir = path.join(projectRoot, 'data');
const sofasPath = path.join(dataDir, 'sofas.json');
const questionsPath = path.join(dataDir, 'questions.json');

let sofasData = { sofas: [] };
let questionsData = { questions: [] };

try {
    sofasData = JSON.parse(fs.readFileSync(sofasPath, 'utf8'));
    console.log(`ソファDB読込: ${sofasData.sofas.length}件`);
} catch (err) {
    console.error('ソファDB読込に失敗:', err.message);
}

try {
    questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    console.log(`質問データ読込: ${questionsData.questions.length}件`);
} catch (err) {
    console.error('質問データ読込に失敗:', err.message);
}

// ルートアクセスで index.html を返す
app.get('/', (req, res) => {
    res.sendFile(path.join(projectRoot, 'src', 'index.html'));
});

// ヒアリング質問取得
app.get('/api/hearing/questions', (req, res) => {
    res.json(questionsData);
});

// おすすめ取得
app.post('/api/recommend', (req, res) => {
    try {
        const answers = req.body || {};
        const result = recommendWithRelaxation(sofasData.sofas, answers);
        res.json(result);
    } catch (error) {
        console.error('recommend error:', error);
        res.status(500).json({ error: 'おすすめ生成に失敗しました' });
    }
});

// ソファ一覧
app.get('/api/sofas', (req, res) => {
    res.json({ sofas: sofasData.sofas });
});

// ソファ詳細
app.get('/api/sofas/:id', (req, res) => {
    const sofa = sofasData.sofas.find(item => item.id === req.params.id);
    if (!sofa) {
        return res.status(404).json({ error: 'ソファが見つかりません' });
    }
    res.json({ sofa });
});

// Gemini API クライアント初期化
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 画像合成 API エンドポイント
app.post('/api/compose', async (req, res) => {
    try {
        const { roomImagePath, sofaImagePath } = req.body;

        if (!roomImagePath || !sofaImagePath) {
            return res.status(400).json({ error: '部屋画像とソファ画像のパスが必要です' });
        }

        // 画像ファイルを読み込んでBase64に変換
        const roomFullPath = path.join(projectRoot, roomImagePath);
        const sofaFullPath = path.join(projectRoot, sofaImagePath);

        if (!fs.existsSync(roomFullPath) || !fs.existsSync(sofaFullPath)) {
            return res.status(404).json({ error: '画像ファイルが見つかりません' });
        }

        const roomBase64 = fs.readFileSync(roomFullPath).toString('base64');
        const sofaBase64 = fs.readFileSync(sofaFullPath).toString('base64');

        const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
        const roomMime = mimeMap[path.extname(roomFullPath).toLowerCase()] || 'image/png';
        const sofaMime = mimeMap[path.extname(sofaFullPath).toLowerCase()] || 'image/png';

        console.log('Gemini API に画像合成をリクエスト中...');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            text: 'この部屋の画像（1枚目）に、このソファ（2枚目）を自然に配置した画像を生成してください。ソファのサイズ・パース・ライティングを部屋に合わせて、違和感なく合成してください。部屋の雰囲気を壊さないようにしてください。'
                        },
                        {
                            inlineData: {
                                mimeType: roomMime,
                                data: roomBase64,
                            },
                        },
                        {
                            inlineData: {
                                mimeType: sofaMime,
                                data: sofaBase64,
                            },
                        },
                    ],
                },
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
            },
        });

        // レスポンスから画像を抽出
        let resultImage = null;
        let resultText = '';

        if (response.candidates && response.candidates[0]) {
            for (const part of response.candidates[0].content.parts) {
                if (part.text) {
                    resultText += part.text;
                } else if (part.inlineData) {
                    resultImage = {
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data,
                    };
                }
            }
        }

        if (!resultImage) {
            console.log('Gemini response text:', resultText);
            return res.status(500).json({
                error: '画像の生成に失敗しました',
                detail: resultText || 'レスポンスに画像が含まれていませんでした',
            });
        }

        // アップロード画像は一度使ったら削除
        if (roomFullPath.startsWith(uploadDir)) {
            fs.unlink(roomFullPath, (err) => {
                if (err) console.error('アップロード画像の削除に失敗:', err);
                else console.log('アップロード画像を削除しました:', roomFullPath);
            });
        }

        console.log('画像合成成功');
        res.json({
            image: resultImage,
            text: resultText,
        });
    } catch (error) {
        console.error('合成エラー:', error);
        res.status(500).json({
            error: '画像合成中にエラーが発生しました',
            detail: error.message,
        });
    }
});

// 部屋画像アップロード
app.post('/api/upload-room', upload.single('roomImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'ファイルがアップロードされていません' });
    }
    res.json({
        id: `uploaded-${req.file.filename}`,
        path: `/images/rooms/uploads/${req.file.filename}`,
        name: req.file.originalname,
    });
});

// アップロード済み部屋画像一覧
app.get('/api/uploaded-rooms', (req, res) => {
    if (!fs.existsSync(uploadDir)) {
        return res.json([]);
    }
    const files = fs.readdirSync(uploadDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
    res.json(files.map(f => ({
        id: `uploaded-${f}`,
        path: `/images/rooms/uploads/${f}`,
        name: f,
    })));
});

// multer エラーハンドリング
app.use((err, req, res, next) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'ファイルサイズが大きすぎます（上限: 10MB）' });
    }
    if (err.message && err.message.includes('許可されていない')) {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

app.listen(PORT, () => {
    console.log(`サーバー起動: http://localhost:${PORT}`);
});
