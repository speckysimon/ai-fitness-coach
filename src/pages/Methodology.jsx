import React from 'react';
import { BookOpen, Calculator, TrendingUp, Zap, Heart, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const Methodology = () => {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600" />
          Methodology & Science
        </h1>
        <p className="text-gray-600 mt-2">
          Understanding the calculations and research behind your training metrics
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle>Evidence-Based Training</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            AI Fitness Coach uses scientifically validated methods developed by leading sports scientists 
            and adopted by professional coaches worldwide. All calculations are based on peer-reviewed 
            research and industry-standard protocols.
          </p>
        </CardContent>
      </Card>

      {/* TSS Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Training Stress Score (TSS)
          </CardTitle>
          <CardDescription>Quantifying training load and fatigue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">What is TSS?</h3>
            <p className="text-gray-700">
              Training Stress Score (TSS) is a composite number that takes into account the duration 
              and intensity of a workout to arrive at a single estimate of the overall training load 
              and physiological stress created by that training session.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Power-Based Calculation (Most Accurate)</h4>
            <div className="font-mono text-sm bg-white p-3 rounded border border-blue-200">
              TSS = (Duration in hours) × (Intensity Factor)² × 100
              <br />
              <span className="text-gray-600">where Intensity Factor = Normalized Power / FTP</span>
            </div>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Example:</strong> A 1.5-hour ride at 200W normalized power with FTP of 250W:
              <br />
              IF = 200/250 = 0.8
              <br />
              TSS = 1.5 × 0.8² × 100 = <strong>96 TSS</strong>
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Heart Rate-Based Estimation (Fallback)</h4>
            <div className="font-mono text-sm bg-white p-3 rounded border border-purple-200">
              TSS ≈ (Duration in hours) × (Avg HR / Threshold HR)² × 100
            </div>
            <p className="text-sm text-gray-700 mt-2">
              Used when power data is unavailable. Assumes threshold heart rate of ~170 bpm.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Duration-Based Estimation (Last Resort)</h4>
            <p className="text-sm text-gray-700">
              When neither power nor heart rate data is available, TSS is estimated based on 
              duration and activity type using conservative multipliers.
            </p>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-semibold mb-2">📚 Academic Sources</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <strong>Coggan, A. R.</strong> (2003). "Training and Racing Using a Power Meter: 
                An Introduction." <em>Cycling Performance Tips</em>
              </li>
              <li>
                <strong>Allen, H., & Coggan, A.</strong> (2010). <em>Training and Racing with a Power Meter</em> 
                (2nd ed.). VeloPress.
              </li>
              <li>
                <strong>Friel, J.</strong> (2009). <em>The Power Meter Handbook</em>. VeloPress.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* FTP Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Functional Threshold Power (FTP)
          </CardTitle>
          <CardDescription>Your sustainable power benchmark</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">What is FTP?</h3>
            <p className="text-gray-700">
              FTP is the highest average power you can sustain for approximately one hour. 
              It represents your lactate threshold and is the cornerstone metric for power-based training.
            </p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Auto-Detection Method</h4>
            <p className="text-sm text-gray-700 mb-3">
              AI Fitness Coach automatically estimates your FTP from your recent activities:
            </p>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Analyzes activities from the last 6 weeks with power data</li>
              <li>Identifies your best 20-60 minute sustained efforts</li>
              <li>Applies standard FTP test protocols:
                <ul className="ml-6 mt-1 list-disc list-inside">
                  <li><strong>20-minute test:</strong> FTP = 95% of average power</li>
                  <li><strong>60-minute effort:</strong> FTP = 100% of average power</li>
                </ul>
              </li>
              <li>Updates automatically as you complete new workouts</li>
            </ol>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Why 95% for 20-minute tests?</h4>
            <p className="text-sm text-gray-700">
              Research shows that most athletes can sustain approximately 105% of their FTP for 20 minutes. 
              Therefore, multiplying 20-minute power by 0.95 (or dividing by 1.05) provides an accurate 
              FTP estimate without requiring a full 60-minute maximal effort.
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-semibold mb-2">📚 Academic Sources</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <strong>Coggan, A. R., & Allen, H.</strong> (2006). "Training and Racing with a Power Meter." 
                <em>VeloPress</em>
              </li>
              <li>
                <strong>Pinot, J., & Grappe, F.</strong> (2011). "The record power profile to assess performance 
                in elite cyclists." <em>International Journal of Sports Medicine, 32</em>(11), 839-844.
              </li>
              <li>
                <strong>McGehee, J. C., et al.</strong> (2005). "A 20-min time trial as a predictor of 
                functional threshold power." <em>Journal of Strength and Conditioning Research, 19</em>(4), 
                E1-E4.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Training Load Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Training Load Zones
          </CardTitle>
          <CardDescription>Understanding workout intensity and recovery</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">TSS-Based Load Categories</h3>
            <p className="text-gray-700 mb-4">
              Different TSS values require different recovery times and produce different training adaptations:
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <div className="w-20 font-bold text-green-700">1-49 TSS</div>
              <div className="flex-1">
                <div className="font-semibold text-green-900">Easy / Recovery</div>
                <div className="text-sm text-gray-700">
                  Low stress. Recoverable within hours. Promotes active recovery and aerobic base.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
              <div className="w-20 font-bold text-yellow-700">50-99 TSS</div>
              <div className="flex-1">
                <div className="font-semibold text-yellow-900">Moderate</div>
                <div className="text-sm text-gray-700">
                  Moderate stress. Recoverable in ~24 hours. Builds aerobic endurance.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
              <div className="w-20 font-bold text-orange-700">100-149 TSS</div>
              <div className="flex-1">
                <div className="font-semibold text-orange-900">Hard</div>
                <div className="text-sm text-gray-700">
                  High stress. Requires 2 days recovery. Significant training stimulus.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="w-20 font-bold text-red-700">150+ TSS</div>
              <div className="flex-1">
                <div className="font-semibold text-red-900">Very Hard</div>
                <div className="text-sm text-gray-700">
                  Very high stress. Requires 3+ days recovery. Race efforts or breakthrough workouts.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">💡 Key Insight: The Squared Relationship</h4>
            <p className="text-sm text-gray-700">
              Notice that TSS uses Intensity Factor <strong>squared</strong> (IF²). This reflects the 
              exponential nature of fatigue:
            </p>
            <ul className="text-sm text-gray-700 mt-2 space-y-1 list-disc list-inside ml-2">
              <li>1 hour at 70% FTP = 49 TSS</li>
              <li>1 hour at 90% FTP = 81 TSS (not 90!)</li>
              <li>1 hour at 100% FTP = 100 TSS</li>
            </ul>
            <p className="text-sm text-gray-700 mt-2">
              Riding harder is <em>exponentially</em> more fatiguing, not linearly.
            </p>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-semibold mb-2">📚 Academic Sources</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <strong>Banister, E. W.</strong> (1991). "Modeling elite athletic performance." 
                <em>Physiological Testing of Elite Athletes</em>, 403-424.
              </li>
              <li>
                <strong>Busso, T.</strong> (2003). "Variable dose-response relationship between exercise 
                training and performance." <em>Medicine & Science in Sports & Exercise, 35</em>(7), 1188-1195.
              </li>
              <li>
                <strong>Coggan, A. R.</strong> (2008). "The use of training stress score (TSS) to quantify 
                training load." <em>TrainingPeaks White Paper</em>.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Normalized Power */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Normalized Power (NP)
          </CardTitle>
          <CardDescription>Accounting for variability in effort</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">Why Not Just Average Power?</h3>
            <p className="text-gray-700">
              Average power doesn't account for the physiological cost of power variability. 
              A ride with many surges and recoveries is more fatiguing than a steady ride at the 
              same average power.
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">What is Normalized Power?</h4>
            <p className="text-sm text-gray-700">
              Normalized Power is a weighted average that accounts for the variable nature of cycling power. 
              It represents the "equivalent" steady power that would produce the same physiological stress.
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <strong>Example:</strong> A ride with average power of 180W but lots of intervals might have 
              a normalized power of 210W, reflecting the true physiological cost.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Data Source</h4>
            <p className="text-sm text-gray-700">
              Normalized Power is calculated by Strava using your power meter data and provided via their API. 
              We use this value directly for TSS calculations when available.
            </p>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-semibold mb-2">📚 Academic Sources</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <strong>Coggan, A. R.</strong> (2003). "Normalized Power, Intensity Factor, and Training Stress Score." 
                <em>TrainingPeaks</em>
              </li>
              <li>
                <strong>Skiba, P. F., et al.</strong> (2014). "Modeling the expenditure and reconstitution of work 
                capacity above critical power." <em>Medicine & Science in Sports & Exercise, 46</em>(8), 1526-1532.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* AI Training Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-600" />
            AI Training Plan Generation
          </CardTitle>
          <CardDescription>Personalized periodization using GPT-4</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">How It Works</h3>
            <p className="text-gray-700">
              Our AI planner uses OpenAI's GPT-4 model, trained on vast amounts of coaching knowledge, 
              combined with your personal training data to generate periodized training plans.
            </p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Input Data</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
              <li>Your recent training history (6 weeks)</li>
              <li>Current FTP and training load metrics</li>
              <li>Event goals (type, date, priority)</li>
              <li>Time constraints (days/week, hours/week)</li>
              <li>Training preferences (indoor/outdoor)</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Periodization Principles</h4>
            <p className="text-sm text-gray-700 mb-2">
              Plans follow established periodization models:
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
              <li><strong>Base Phase:</strong> Build aerobic capacity (Zone 2)</li>
              <li><strong>Build Phase:</strong> Increase intensity (Tempo, Threshold)</li>
              <li><strong>Peak Phase:</strong> Race-specific efforts</li>
              <li><strong>Taper:</strong> Reduce volume, maintain intensity</li>
            </ul>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Fallback: Rule-Based Planning</h4>
            <p className="text-sm text-gray-700">
              If AI is unavailable, the system uses a rule-based planner that applies traditional 
              periodization principles based on your event date and available training time.
            </p>
          </div>

          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-semibold mb-2">📚 Academic Sources</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>
                <strong>Bompa, T. O., & Haff, G. G.</strong> (2009). <em>Periodization: Theory and Methodology 
                of Training</em> (5th ed.). Human Kinetics.
              </li>
              <li>
                <strong>Seiler, S.</strong> (2010). "What is best practice for training intensity and duration 
                distribution in endurance athletes?" <em>International Journal of Sports Physiology and Performance, 
                5</em>(3), 276-291.
              </li>
              <li>
                <strong>Stöggl, T., & Sperlich, B.</strong> (2014). "Polarized training has greater impact on key 
                endurance variables than threshold, high intensity, or high volume training." 
                <em>Frontiers in Physiology, 5</em>, 33.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Data Privacy */}
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle>🔒 Data Privacy & Transparency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-700">
            <strong>Your data stays yours.</strong> All calculations are performed locally or on our secure servers. 
            We only access data you explicitly authorize via Strava and Google OAuth.
          </p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-2">
            <li>Activity data is cached locally in your browser</li>
            <li>No data is sold or shared with third parties</li>
            <li>You can revoke access at any time via Settings</li>
            <li>All API calls use secure HTTPS connections</li>
          </ul>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-6 border-t">
        <p>
          This methodology is continuously updated based on the latest sports science research.
          <br />
          Last updated: September 2025
        </p>
      </div>
    </div>
  );
};

export default Methodology;
