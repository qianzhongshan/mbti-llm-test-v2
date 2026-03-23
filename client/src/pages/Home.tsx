import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ChevronRight, Settings, Send, Loader2 } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
}

interface Answer {
  questionId: number;
  choice: 'A' | 'B' | null;
  narrative: string;
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('apiUrl') || '');
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // 加载题目
  useEffect(() => {
    fetch('/mbti_questions.json')
      .then(res => res.json())
      .then(data => {
        setQuestions(data);
        // 初始化答案数组
        const initialAnswers = data.map((q: Question) => ({
          questionId: q.id,
          choice: null,
          narrative: ''
        }));
        setAnswers(initialAnswers);
      });
  }, []);

  // 保存 API 配置
  const saveSettings = () => {
    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('apiKey', apiKey);
    setShowSettings(false);
  };

  // 更新当前答案
  const updateAnswer = (choice: 'A' | 'B' | null, narrative: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = {
      questionId: questions[currentIndex].id,
      choice,
      narrative
    };
    setAnswers(newAnswers);
  };

  // 获取当前答案
  const currentAnswer = answers[currentIndex];

  // 下一题
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // 上一题
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 提交并调用 LLM 分析
  const handleSubmit = async () => {
    if (!apiUrl || !apiKey) {
      alert('请先配置 LLM API 地址和密钥');
      setShowSettings(true);
      return;
    }

    setLoading(true);
    try {
      // 构建提示词
      const answersText = answers
        .map(ans => {
          const q = questions.find(q => q.id === ans.questionId);
          if (!q) return '';
          let text = `Q${ans.questionId}: ${q.question}\n`;
          if (ans.choice) {
            text += `选择: ${ans.choice === 'A' ? q.optionA : q.optionB}\n`;
          }
          if (ans.narrative) {
            text += `用户论述: ${ans.narrative}\n`;
          }
          return text;
        })
        .filter(t => t)
        .join('\n');

      const prompt = `请根据以下 MBTI 测试答案和用户的论述，进行深度的性格分析。分析应该包括：
1. 用户的 MBTI 类型倾向
2. 性格特点分析
3. 优势和潜在改进方向
4. 职业建议
5. 人际关系建议

用户答案：
${answersText}

请提供一份详细的性格分析报告。`;

      // 调用 LLM API（支持 OpenAI 兼容的 API）
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`API 错误: ${response.statusText}`);
      }

      const data = await response.json();
      const analysisResult = data.choices[0].message.content;
      setResult(analysisResult);
    } catch (error) {
      alert(`分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">加载题目中...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 shadow-xl">
            <h1 className="text-3xl font-bold text-indigo-900 mb-6">性格分析结果</h1>
            <div className="prose prose-sm max-w-none mb-8 whitespace-pre-wrap text-gray-700 leading-relaxed">
              {result}
            </div>
            <Button
              onClick={() => {
                setResult(null);
                setCurrentIndex(0);
                setAnswers(answers.map(a => ({ ...a, choice: null, narrative: '' })));
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              重新测试
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* 设置按钮 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-indigo-900">MBTI 深度性格测试</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            配置
          </Button>
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <Card className="p-6 mb-6 bg-white border-indigo-200">
            <h2 className="text-lg font-semibold text-indigo-900 mb-4">LLM API 配置</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 地址
                </label>
                <Input
                  placeholder="例如: https://api.openai.com/v1/chat/completions"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="border-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 密钥
                </label>
                <Input
                  type="password"
                  placeholder="输入你的 API 密钥"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="border-indigo-200"
                />
              </div>
              <Button
                onClick={saveSettings}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                保存配置
              </Button>
            </div>
          </Card>
        )}

        {/* 进度条 */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>第 {currentIndex + 1} / {questions.length} 题</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 题目卡片 */}
        <Card className="p-8 mb-6 bg-white shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-8">
            {currentQ.question}
          </h2>

          {/* 三区域选择布局 */}
          <div className="space-y-6">
            {/* 选项 A */}
            <div
              onClick={() => updateAnswer('A', currentAnswer.narrative)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                currentAnswer.choice === 'A'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer.choice === 'A'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {currentAnswer.choice === 'A' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="font-medium text-gray-800">{currentQ.optionA}</span>
              </div>
            </div>

            {/* 论述框 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                补充说明（可选）
              </label>
              <Textarea
                placeholder="在这里写下你的想法或解释..."
                value={currentAnswer.narrative}
                onChange={(e) => updateAnswer(currentAnswer.choice, e.target.value)}
                className="border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
              />
            </div>

            {/* 选项 B */}
            <div
              onClick={() => updateAnswer('B', currentAnswer.narrative)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                currentAnswer.choice === 'B'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 bg-gray-50 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    currentAnswer.choice === 'B'
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300'
                  }`}
                >
                  {currentAnswer.choice === 'B' && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="font-medium text-gray-800">{currentQ.optionB}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 导航按钮 */}
        <div className="flex gap-4">
          <Button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            variant="outline"
            className="flex-1"
          >
            上一题
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  提交并分析
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2"
            >
              下一题
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
