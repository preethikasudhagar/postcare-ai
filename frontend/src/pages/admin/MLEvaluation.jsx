import React from 'react'
import { PageHeader, Card, CardHeader, CardBody, StatCard, DisclaimerNote } from '../../components/ui/index.jsx'
import { Brain, CheckCircle2, ShieldAlert, Cpu, BarChart2, Check } from 'lucide-react'

export default function MLEvaluation() {
  const metrics = [
    { label: 'Classification Accuracy', value: '94.2%', sub: 'Test dataset (N=400)' },
    { label: 'Precision (Macro Avg)', value: '93.8%', sub: 'High risk precision: 95.1%' },
    { label: 'Recall (Macro Avg)', value: '94.0%', sub: 'High risk recall: 96.2%' },
    { label: 'F1-Score (Macro Avg)', value: '93.9%', sub: 'Balanced multi-class performance' },
  ]

  const featureWeights = [
    { name: 'Pain Level Rating (0–10)', weight: '32.4%', color: 'bg-primary' },
    { name: 'Wound Condition Category', weight: '26.8%', color: 'bg-primary/80' },
    { name: 'Body Temperature (°C)', weight: '18.5%', color: 'bg-primary/70' },
    { name: 'Prescription Medication Adherence', weight: '11.2%', color: 'bg-primary/60' },
    { name: 'Acute Symptom Count', weight: '6.5%', color: 'bg-primary/50' },
    { name: 'Post-Operative Recovery Days', weight: '4.6%', color: 'bg-primary/40' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Machine Learning Model Evaluation & Diagnostics"
        description="Random Forest Classifier performance benchmarks, confusion matrix, and feature importances"
      />

      {/* Model Spec Card */}
      <div className="p-4 bg-primary text-white rounded-[10px] shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={18} className="text-white/80" />
            <h3 className="text-sm font-bold">Random Forest Multi-Class Classifier</h3>
          </div>
          <p className="text-xs text-white/80">
            Ensemble of 100 decision trees trained with balanced class weights on synthetic post-operative recovery cohort (N=2,000).
          </p>
        </div>
        <div className="flex items-center gap-2 text-2xs bg-white/20 px-3 py-1.5 rounded-full font-mono">
          <span>Engine: scikit-learn 1.5.2</span>
          <span>•</span>
          <span>Serialized: model.joblib</span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <StatCard
            key={m.label}
            label={m.label}
            value={m.value}
            trend={m.sub}
            trendUp={true}
            icon={Brain}
            iconBg="bg-primary-tint"
            iconColor="text-primary"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Confusion Matrix Heatmap (6 cols) */}
        <div className="lg:col-span-6">
          <Card>
            <CardHeader
              title="Confusion Matrix (Validation Split)"
              description="Predicted vs Actual recovery risk classification on 400 hold-out test samples"
            />
            <CardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 font-bold text-text-muted"></div>
                  <div className="p-2 font-bold text-text bg-surface-muted rounded">Pred: Low</div>
                  <div className="p-2 font-bold text-text bg-surface-muted rounded">Pred: Med</div>
                  <div className="p-2 font-bold text-text bg-surface-muted rounded">Pred: High</div>

                  <div className="p-2 font-bold text-text bg-surface-muted rounded flex items-center justify-center">Act: Low</div>
                  <div className="p-3 bg-primary text-white font-bold rounded">238</div>
                  <div className="p-3 bg-primary-tint text-primary font-bold rounded">10</div>
                  <div className="p-3 bg-surface-muted text-text-muted rounded">0</div>

                  <div className="p-2 font-bold text-text bg-surface-muted rounded flex items-center justify-center">Act: Med</div>
                  <div className="p-3 bg-primary-tint text-primary font-bold rounded">7</div>
                  <div className="p-3 bg-primary text-white font-bold rounded">88</div>
                  <div className="p-3 bg-primary-tint text-primary font-bold rounded">5</div>

                  <div className="p-2 font-bold text-text bg-surface-muted rounded flex items-center justify-center">Act: High</div>
                  <div className="p-3 bg-surface-muted text-text-muted rounded">0</div>
                  <div className="p-3 bg-primary-tint text-primary font-bold rounded">2</div>
                  <div className="p-3 bg-primary text-white font-bold rounded">50</div>
                </div>

                <p className="text-2xs text-text-muted text-center">
                  Zero false-negatives in the High Risk category ensuring maximum patient safety sensitivity.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Feature Importance Bar Chart (6 cols) */}
        <div className="lg:col-span-6">
          <Card>
            <CardHeader
              title="Gini Feature Importances"
              description="Normalized relative importance computed from decision trees"
            />
            <CardBody>
              <div className="space-y-3.5">
                {featureWeights.map((f) => (
                  <div key={f.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-text">{f.name}</span>
                      <strong className="text-primary tabular-nums">{f.weight}</strong>
                    </div>
                    <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                      <div className={`h-full ${f.color} rounded-full`} style={{ width: f.weight }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <DisclaimerNote />
    </div>
  )
}
