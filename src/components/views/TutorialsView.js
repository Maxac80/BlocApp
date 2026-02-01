/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Play, ChevronLeft, ChevronRight, Check, ExternalLink, BookOpen, Video, FileText } from 'lucide-react';

/**
 * 🎓 TUTORIALS VIEW - TUTORIALE ACCESSIBILE DIN APLICAȚIA PRINCIPALĂ
 * 
 * Bazată pe TutorialStep din wizard, dar adaptată pentru accesul permanent
 */
const TutorialsView = ({ association, updateAssociation }) => {
  const [currentTutorial, setCurrentTutorial] = useState(0);
  const [completedTutorials, setCompletedTutorials] = useState([]);

  // Încarcă progresul din asociație
  useEffect(() => {
    if (association?.tutorialsProgress?.completedTutorials) {
      setCompletedTutorials(association.tutorialsProgress.completedTutorials);
    }
  }, [association]);

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

  const handleTutorialComplete = async (tutorialId) => {
    const newCompleted = [...completedTutorials, tutorialId];
    setCompletedTutorials(newCompleted);
    
    // Salvează progresul în asociație
    if (association && updateAssociation) {
      try {
        await updateAssociation({
          tutorialsProgress: {
            completedTutorials: newCompleted,
            lastViewedAt: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('❌ Error saving tutorial progress:', error);
      }
    }
  };

  const currentTut = tutorials[currentTutorial];
  const isCompleted = completedTutorials.includes(currentTut.id);
  const progressPercentage = (completedTutorials.length / tutorials.length) * 100;

  const currentMonthStr = new Date().toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
  // Pentru TutorialsView, folosim mereu luna curentă (albastru) deoarece nu are month selector
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-4 pb-20 lg:pb-2">
      <div className="w-full">

        {/* Header */}
        <div className="mb-4 sm:mb-6 pt-3 sm:pt-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Tutoriale BlocApp</h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Învață să folosești toate funcționalitățile pentru administrarea eficientă
          </p>
        </div>

        {/* Progres general */}
        {completedTutorials.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Progresul tău</h3>
              <span className="text-xs sm:text-sm text-gray-600">
                {completedTutorials.length}/{tutorials.length} completate
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 mb-3">
              <div
                className="bg-green-600 h-2 sm:h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            {completedTutorials.length === tutorials.length && (
              <div className="bg-green-50 border border-green-200 rounded-md p-2.5 sm:p-3 text-center">
                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 mx-auto mb-1" />
                <p className="text-green-800 text-xs sm:text-sm font-medium">
                  Felicitări! Ai completat toate tutorialele!
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Lista Tutoriale */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 sticky top-4">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Tutoriale disponibile</h4>
              <div className="space-y-2">
                {tutorials.map((tutorial, index) => (
                  <button
                    key={tutorial.id}
                    onClick={() => setCurrentTutorial(index)}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-md border transition-all ${
                      currentTutorial === index
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <tutorial.icon className={`w-4 h-4 mt-0.5 mr-2 ${
                          completedTutorials.includes(tutorial.id)
                            ? 'text-green-600'
                            : 'text-gray-600'
                        }`} />
                        <div>
                          <h5 className="font-medium text-gray-900 text-xs sm:text-sm">{tutorial.title}</h5>
                          <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">{tutorial.duration}</p>
                        </div>
                      </div>
                      {completedTutorials.includes(tutorial.id) && (
                        <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conținut Tutorial Curent */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">

              {/* Header Tutorial */}
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                      {currentTut.title}
                    </h4>
                    <p className="text-gray-600 text-xs sm:text-sm">{currentTut.description}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <currentTut.icon className="w-3.5 h-3.5 mr-1.5" />
                      <span>{currentTut.duration}</span>
                      <span className="mx-1.5">•</span>
                      <span className="capitalize">{currentTut.type}</span>
                    </div>
                  </div>

                  {isCompleted && (
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Completat</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conținut Tutorial */}
              <div className="p-3 sm:p-4">

                {/* Video Placeholder */}
                <div className="bg-gray-900 rounded-md mb-4 relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => handleTutorialComplete(currentTut.id)}
                      className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all"
                    >
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3">
                    <div className="bg-black bg-opacity-50 rounded text-white p-1.5 sm:p-2 text-xs">
                      {currentTut.title} - {currentTut.duration}
                    </div>
                  </div>
                </div>

                {/* Puncte Cheie */}
                <div className="mb-4">
                  <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">Ce vei învăța:</h5>
                  <ul className="space-y-1.5">
                    {currentTut.content.points.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                          <span className="text-blue-600 text-[10px] font-medium">{index + 1}</span>
                        </div>
                        <span className="text-gray-700 text-xs sm:text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Acțiuni Tutorial */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => setCurrentTutorial(Math.max(0, currentTutorial - 1))}
                      disabled={currentTutorial === 0}
                      className="flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                      Anterior
                    </button>

                    <button
                      onClick={() => setCurrentTutorial(Math.min(tutorials.length - 1, currentTutorial + 1))}
                      disabled={currentTutorial >= tutorials.length - 1}
                      className="flex items-center px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Următorul
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleTutorialComplete(currentTut.id)}
                    className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      isCompleted
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCompleted ? 'Completat' : 'Marchează ca vizionat'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resurse Suplimentare */}
        <div className="mt-6 sm:mt-8">
          <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Resurse suplimentare</h4>

          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            {resources.map((resource, index) => (
              <div key={index} className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">{resource.title}</h5>
                    <p className="text-gray-600 text-[10px] sm:text-xs mb-2">{resource.description}</p>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Accesează resursa
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>

                  <div className="bg-blue-100 p-1.5 rounded-md ml-2 flex-shrink-0">
                    {resource.type === 'pdf' && <FileText className="w-4 h-4 text-blue-600" />}
                    {resource.type === 'excel' && <FileText className="w-4 h-4 text-green-600" />}
                    {resource.type === 'video' && <Video className="w-4 h-4 text-red-600" />}
                    {resource.type === 'help' && <BookOpen className="w-4 h-4 text-purple-600" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-4 sm:mt-6 bg-gray-50 rounded-md p-2.5 sm:p-3">
          <h4 className="text-xs sm:text-sm font-medium text-gray-800 mb-1.5">Informații despre tutoriale</h4>
          <ul className="text-[10px] sm:text-xs text-gray-600 space-y-0.5">
            <li>• Tutorialele sunt opționale - poți folosi aplicația fără să le urmărești</li>
            <li>• Progresul tău este salvat automat și sincronizat între sesiuni</li>
            <li>• Poți reveni oricând la tutoriale pentru a revedea funcționalitățile</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default TutorialsView;