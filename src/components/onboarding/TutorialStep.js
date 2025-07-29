import React, { useState, useEffect } from 'react';
import { Play, Check, ExternalLink, BookOpen, Video, FileText } from 'lucide-react';

/**
 * 🎓 TUTORIAL STEP - TUTORIAL INTERACTIV ȘI RESURSE
 */
export default function TutorialStep({ stepData, onUpdateData }) {
  const [currentTutorial, setCurrentTutorial] = useState(0);
  const [completedTutorials, setCompletedTutorials] = useState(stepData.completedTutorials || []);

  // Tutorial step este întotdeauna valid (opțional)
  useEffect(() => {
    onUpdateData({
      ...stepData,
      isValid: true, // Tutorial step e întotdeauna valid
      tutorialsAvailable: tutorials.length
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tutorials = [
    {
      id: 'overview',
      title: 'Prezentare generală BlocApp',
      description: 'O introducere în toate funcționalitățile principale',
      duration: '5 min',
      type: 'video',
      icon: Video,
      content: {
        points: [
          'Navigarea în aplicație și meniul principal',
          'Cum să creezi și gestionezi asociații',
          'Dashboard-ul și statisticile importante',
          'Setările de bază și preferințele'
        ]
      }
    },
    {
      id: 'associations',
      title: 'Gestionarea asociațiilor',
      description: 'Cum să configurezi structura asociației tale',
      duration: '8 min',
      type: 'interactive',
      icon: BookOpen,
      content: {
        points: [
          'Crearea unei noi asociații pas cu pas',
          'Adăugarea blocurilor, scărilor și apartamentelor',
          'Configurarea datelor proprietarilor',
          'Import bulk din Excel pentru structuri mari'
        ]
      }
    },
    {
      id: 'maintenance',
      title: 'Calculul întreținerii',
      description: 'Procesul complet de la cheltuieli la liste',
      duration: '10 min',
      type: 'interactive',
      icon: FileText,
      content: {
        points: [
          'Introducerea cheltuielilor lunare',
          'Citirea contoarelor și consumurilor',
          'Calculul automat al întreținerii',
          'Generarea și publicarea listelor'
        ]
      }
    },
    {
      id: 'payments',
      title: 'Plăți și încasări',
      description: 'Gestionarea plăților și reconcilierea',
      duration: '6 min',
      type: 'video',
      icon: Video,
      content: {
        points: [
          'Configurarea plăților online',
          'Urmărirea plăților și restanțelor',
          'Reconcilierea automată',
          'Rapoarte financiare și statistici'
        ]
      }
    }
  ];

  const resources = [
    {
      title: 'Ghid de început rapid',
      description: 'PDF cu pașii esențiali pentru prima configurare',
      type: 'pdf',
      url: '/guides/quick-start-guide.pdf'
    },
    {
      title: 'Template Excel pentru import',
      description: 'Fișier Excel pregătit pentru importul apartamentelor',
      type: 'excel',
      url: '/templates/apartments-import-template.xlsx'
    },
    {
      title: 'Videoclipuri complete pe YouTube',
      description: 'Canalul nostru cu tutoriale detaliate',
      type: 'video',
      url: 'https://youtube.com/blocapp'
    },
    {
      title: 'Centrul de suport',
      description: 'Articole detaliate și FAQ pentru toate funcționalitățile',
      type: 'help',
      url: 'https://suport.blocapp.ro'
    }
  ];

  const handleTutorialComplete = (tutorialId) => {
    const newCompleted = [...completedTutorials, tutorialId];
    setCompletedTutorials(newCompleted);
    onUpdateData({
      ...stepData,
      completedTutorials: newCompleted,
      tutorialsViewed: true,
      lastViewedAt: new Date().toISOString()
    });
  };

  const handleSkipTutorials = () => {
    onUpdateData({
      ...stepData,
      skippedTutorials: true,
      tutorialsViewed: false,
      lastViewedAt: new Date().toISOString()
    });
  };

  const currentTut = tutorials[currentTutorial];
  const isCompleted = completedTutorials.includes(currentTut.id);

  return (
    <div className="max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          🎓 Să învățăm împreună BlocApp!
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Aceste tutoriale te vor ajuta să stăpânești rapid toate funcționalitățile. 
          Poți să le urmărești acum sau să revii oricând la ele.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* LISTA TUTORIALE */}
        <div className="lg:col-span-1">
          <h4 className="font-semibold text-gray-900 mb-4">Tutoriale disponibile</h4>
          <div className="space-y-3">
            {tutorials.map((tutorial, index) => (
              <button
                key={tutorial.id}
                onClick={() => setCurrentTutorial(index)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  currentTutorial === index
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <tutorial.icon className={`w-5 h-5 mt-0.5 mr-3 ${
                      completedTutorials.includes(tutorial.id) 
                        ? 'text-green-600' 
                        : 'text-gray-600'
                    }`} />
                    <div>
                      <h5 className="font-medium text-gray-900 text-sm">{tutorial.title}</h5>
                      <p className="text-xs text-gray-600 mt-1">{tutorial.duration}</p>
                    </div>
                  </div>
                  {completedTutorials.includes(tutorial.id) && (
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* PROGRES */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-900">Progres</span>
              <span className="text-sm text-green-700">
                {completedTutorials.length}/{tutorials.length}
              </span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(completedTutorials.length / tutorials.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* CONȚINUT TUTORIAL CURENT */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            
            {/* HEADER TUTORIAL */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    {currentTut.title}
                  </h4>
                  <p className="text-gray-600">{currentTut.description}</p>
                  <div className="flex items-center mt-3 text-sm text-gray-500">
                    <currentTut.icon className="w-4 h-4 mr-2" />
                    <span>{currentTut.duration}</span>
                    <span className="mx-2">•</span>
                    <span className="capitalize">{currentTut.type}</span>
                  </div>
                </div>
                
                {isCompleted && (
                  <div className="flex items-center text-green-600">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="text-sm font-medium">Completat</span>
                  </div>
                )}
              </div>
            </div>

            {/* CONȚINUT TUTORIAL */}
            <div className="p-6">
              
              {/* VIDEO PLACEHOLDER */}
              <div className="bg-gray-900 rounded-lg mb-6 relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button 
                    onClick={() => {
                      if (!isCompleted) {
                        handleTutorialComplete(currentTut.id);
                      }
                    }}
                    className="flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
                  >
                    <Play className="w-8 h-8 text-white ml-1" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black bg-opacity-50 rounded text-white p-2 text-sm">
                    {currentTut.title} - {currentTut.duration}
                  </div>
                </div>
              </div>

              {/* PUNCTE CHEIE */}
              <div className="mb-6">
                <h5 className="font-semibold text-gray-900 mb-3">Ce vei învăța:</h5>
                <ul className="space-y-2">
                  {currentTut.content.points.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
                        <span className="text-blue-600 text-xs font-medium">{index + 1}</span>
                      </div>
                      <span className="text-gray-700 text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* RESURSE SUPLIMENTARE */}
      <div className="mt-12">
        <h4 className="text-xl font-semibold text-gray-900 mb-6">📚 Resurse suplimentare</h4>
        
        <div className="grid md:grid-cols-2 gap-6">
          {resources.map((resource, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-semibold text-gray-900 mb-2">{resource.title}</h5>
                  <p className="text-gray-600 text-sm mb-4">{resource.description}</p>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Accesează resursa
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </div>
                
                <div className="bg-blue-100 p-2 rounded-lg">
                  {resource.type === 'pdf' && <FileText className="w-5 h-5 text-blue-600" />}
                  {resource.type === 'excel' && <FileText className="w-5 h-5 text-green-600" />}
                  {resource.type === 'video' && <Video className="w-5 h-5 text-red-600" />}
                  {resource.type === 'help' && <BookOpen className="w-5 h-5 text-purple-600" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SKIP OPTION */}
      <div className="mt-8 text-center">
        <button
          onClick={handleSkipTutorials}
          className="text-gray-600 hover:text-gray-800 transition-colors text-sm"
        >
          Omite tutorialele - vreau să explorez singur aplicația →
        </button>
      </div>

      {/* COMPLETION MESSAGE */}
      {completedTutorials.length === tutorials.length && (
        <div className="mt-8 bg-green-50 rounded-xl p-6 border border-green-200 text-center">
          <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-green-900 mb-2">
            🎉 Felicitări! Ai completat toate tutorialele
          </h4>
          <p className="text-green-800">
            Acum ești pregătit să folosești BlocApp la capacitate maximă. 
            Să începem administrarea eficientă!
          </p>
        </div>
      )}
    </div>
  );
}