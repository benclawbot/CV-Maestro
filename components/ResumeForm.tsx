import React from 'react';
import { ResumeData } from '../types';
import { Plus, Trash2, Wand2, ChevronDown, ChevronUp, GripVertical, Settings2 } from 'lucide-react';
import { rewriteContent, generateSummary } from '../services/minimaxService';

interface ResumeFormProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  skillSettings?: { showLevel: boolean; style: 'bar' | 'dots' | 'text' };
  onSkillSettingsChange?: (settings: { showLevel: boolean; style: 'bar' | 'dots' | 'text' }) => void;
}

export const ResumeForm: React.FC<ResumeFormProps> = ({ data, onChange, skillSettings, onSkillSettingsChange }) => {
  const [activeSection, setActiveSection] = React.useState<string | null>('personal');
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [bulkSkillText, setBulkSkillText] = React.useState("");
  const [draggedSkillIndex, setDraggedSkillIndex] = React.useState<number | null>(null);

  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value }
    });
  };

  const updateExperience = (index: number, field: string, value: any) => {
    const newExp = [...data.experience];
    newExp[index] = { ...newExp[index], [field]: value };
    onChange({ ...data, experience: newExp });
  };

  const updateSkill = (index: number, field: 'name' | 'level', value: any) => {
    const newSkills = [...data.skills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    onChange({ ...data, skills: newSkills });
  };

  // Drag and Drop Handlers for Skills
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSkillIndex(index);
    // Required for Firefox
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSkillIndex === null || draggedSkillIndex === index) return;

    // Reorder array
    const newSkills = [...data.skills];
    const draggedItem = newSkills[draggedSkillIndex];
    newSkills.splice(draggedSkillIndex, 1);
    newSkills.splice(index, 0, draggedItem);

    onChange({ ...data, skills: newSkills });
    setDraggedSkillIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedSkillIndex(null);
  };

  const handleRewrite = async (text: string, onRewrite: (newText: string) => void) => {
    setIsEnhancing(true);
    const improved = await rewriteContent(text);
    onRewrite(improved);
    setIsEnhancing(false);
  };

  const handleSummaryRewrite = async () => {
    setIsEnhancing(true);
    const newSummary = await generateSummary(data.personalInfo.summary, data.personalInfo.jobTitle);
    updatePersonalInfo('summary', newSummary);
    setIsEnhancing(false);
  };
  
  const handleBulkAddSkills = () => {
      if (!bulkSkillText.trim()) return;
      const newSkillNames = bulkSkillText.split(',').map(s => s.trim()).filter(Boolean);
      const newSkills = newSkillNames.map(name => ({ name, level: 3 }));
      onChange({ ...data, skills: [...data.skills, ...newSkills] });
      setBulkSkillText("");
  };

  const SectionHeader = ({ title, id, isOpen }: { title: string, id: string, isOpen: boolean }) => (
    <button 
      onClick={() => setActiveSection(isOpen ? null : id)}
      className={`flex items-center justify-between w-full p-3 border-b transition-colors text-left text-xs uppercase font-bold tracking-wide ${isOpen ? 'bg-neutral-800 text-white border-neutral-700' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'}`}
    >
      <span>{title}</span>
      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
    </button>
  );

  const Input = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input 
      className="w-full bg-neutral-900 border border-neutral-700 text-white p-2 text-xs focus:outline-none focus:border-white placeholder-neutral-600"
      {...props}
    />
  );

  const TextArea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea 
      className="w-full bg-neutral-900 border border-neutral-700 text-white p-2 text-xs focus:outline-none focus:border-white placeholder-neutral-600"
      {...props}
    />
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800">
      {/* Personal Info */}
      <SectionHeader title="Personal Info" id="personal" isOpen={activeSection === 'personal'} />
      {activeSection === 'personal' && (
        <div className="p-4 space-y-3 bg-neutral-800 animate-fadeIn border-b border-neutral-700">
          <Input placeholder="Full Name" value={data.personalInfo.fullName} onChange={e => updatePersonalInfo('fullName', e.target.value)} />
          <Input placeholder="Job Title" value={data.personalInfo.jobTitle} onChange={e => updatePersonalInfo('jobTitle', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
             <Input placeholder="Email" value={data.personalInfo.email} onChange={e => updatePersonalInfo('email', e.target.value)} />
             <Input placeholder="Phone" value={data.personalInfo.phone} onChange={e => updatePersonalInfo('phone', e.target.value)} />
          </div>
          <Input placeholder="Location" value={data.personalInfo.location} onChange={e => updatePersonalInfo('location', e.target.value)} />
          <div className="relative">
             <TextArea 
               placeholder="Professional Summary" 
               className="w-full bg-neutral-900 border border-neutral-700 text-white p-2 text-xs focus:outline-none focus:border-white placeholder-neutral-600 h-24"
               value={data.personalInfo.summary} 
               onChange={e => updatePersonalInfo('summary', e.target.value)} 
             />
             <button 
                className="absolute right-2 bottom-2 text-[10px] bg-neutral-700 text-white px-2 py-1 flex items-center gap-1 hover:bg-neutral-600"
                onClick={handleSummaryRewrite}
                disabled={isEnhancing}
             >
                <Wand2 size={10} /> {isEnhancing ? 'Writing...' : 'AI Rewrite'}
             </button>
          </div>
        </div>
      )}

      {/* Experience */}
      <SectionHeader title="Experience" id="experience" isOpen={activeSection === 'experience'} />
      {activeSection === 'experience' && (
        <div className="p-4 bg-neutral-800 space-y-4 border-b border-neutral-700">
           {data.experience.map((exp, idx) => (
             <div key={exp.id} className="border border-neutral-700 p-3 bg-neutral-900 relative group">
                <button 
                  className="absolute top-2 right-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                     const newExp = data.experience.filter((_, i) => i !== idx);
                     onChange({ ...data, experience: newExp });
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <div className="mb-2 space-y-2">
                   <Input placeholder="Role" value={exp.role} onChange={e => updateExperience(idx, 'role', e.target.value)} />
                   <div className="grid grid-cols-2 gap-2">
                     <Input placeholder="Company" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)} />
                     <Input placeholder="Duration" value={exp.duration} onChange={e => updateExperience(idx, 'duration', e.target.value)} />
                   </div>
                </div>
                <div className="space-y-2">
                   {exp.description.map((desc, dIdx) => (
                      <div key={dIdx} className="flex gap-2 items-center">
                        <Input 
                          value={desc} 
                          onChange={(e) => {
                             const newDesc = [...exp.description];
                             newDesc[dIdx] = e.target.value;
                             updateExperience(idx, 'description', newDesc);
                          }}
                        />
                        <button 
                            className="text-neutral-500 hover:text-white"
                            onClick={() => handleRewrite(desc, (t) => {
                               const newDesc = [...exp.description];
                               newDesc[dIdx] = t;
                               updateExperience(idx, 'description', newDesc);
                            })}
                            disabled={isEnhancing}
                         >
                            <Wand2 size={12} />
                         </button>
                      </div>
                   ))}
                   <button 
                     className="text-[10px] text-neutral-400 hover:text-white font-bold uppercase tracking-wider flex items-center gap-1 mt-2"
                     onClick={() => {
                        const newDesc = [...exp.description, ""];
                        updateExperience(idx, 'description', newDesc);
                     }}
                   >
                     <Plus size={10} /> Add Bullet
                   </button>
                </div>
             </div>
           ))}
           <button 
              className="w-full py-2 border border-dashed border-neutral-600 text-neutral-400 hover:border-white hover:text-white transition-colors text-xs font-bold uppercase tracking-wide"
              onClick={() => {
                 onChange({
                    ...data,
                    experience: [...data.experience, { id: Date.now().toString(), role: "New Role", company: "Company", duration: "Present", description: ["Description"] }]
                 })
              }}
           >
              Add Position
           </button>
        </div>
      )}
      
      {/* Skills */}
      <SectionHeader title="Skills" id="skills" isOpen={activeSection === 'skills'} />
      {activeSection === 'skills' && (
        <div className="p-4 bg-neutral-800 border-b border-neutral-700">
           {skillSettings && onSkillSettingsChange && (
               <div className="mb-4 space-y-3 p-3 bg-neutral-900 border border-neutral-700">
                   <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-neutral-400 uppercase">Show Levels</span>
                       <button 
                           onClick={() => onSkillSettingsChange({ ...skillSettings, showLevel: !skillSettings.showLevel })}
                           className={`w-8 h-4 rounded-full relative transition-colors ${skillSettings.showLevel ? 'bg-white' : 'bg-neutral-700'}`}
                       >
                           <div className={`w-3 h-3 rounded-full bg-black absolute top-0.5 transition-transform ${skillSettings.showLevel ? 'left-[calc(100%-14px)]' : 'left-0.5'}`} />
                       </button>
                   </div>
                   {skillSettings.showLevel && (
                       <div>
                           <label className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">Visual Style</label>
                           <div className="flex bg-neutral-800 p-1">
                               {(['bar', 'dots', 'text'] as const).map(s => (
                                   <button 
                                      key={s}
                                      onClick={() => onSkillSettingsChange({ ...skillSettings, style: s })}
                                      className={`flex-1 py-1 text-[10px] uppercase font-bold transition-all ${skillSettings.style === s ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                                   >
                                      {s}
                                   </button>
                               ))}
                           </div>
                       </div>
                   )}
               </div>
           )}

           <div className="space-y-2">
               {data.skills.map((skill, i) => (
                   <div 
                      key={i} 
                      className={`flex items-center gap-2 group transition-opacity ${draggedSkillIndex === i ? 'opacity-50' : 'opacity-100'}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                   >
                       <div className="cursor-grab active:cursor-grabbing text-neutral-600 hover:text-white p-1">
                          <GripVertical size={12} />
                       </div>
                       <Input 
                           value={skill.name} 
                           onChange={(e) => updateSkill(i, 'name', e.target.value)}
                           className="flex-1 bg-neutral-900 border border-neutral-700 text-white p-2 text-xs focus:outline-none focus:border-white placeholder-neutral-600"
                           placeholder="Skill Name"
                       />
                       {skillSettings?.showLevel && (
                           <div className="w-24 flex items-center gap-2">
                               <input 
                                   type="range" 
                                   min="1" 
                                   max="5" 
                                   value={skill.level} 
                                   onChange={(e) => updateSkill(i, 'level', parseInt(e.target.value))}
                                   className="w-full accent-white h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                               />
                               <span className="text-[10px] text-neutral-400 w-3">{skill.level}</span>
                           </div>
                       )}
                       <button 
                           onClick={() => onChange({ ...data, skills: data.skills.filter((_, idx) => idx !== i) })}
                           className="text-neutral-600 hover:text-red-500 transition-colors"
                       >
                           <Trash2 size={12} />
                       </button>
                   </div>
               ))}
           </div>
           
           <div className="mt-4 pt-3 border-t border-neutral-700">
                <div className="text-[10px] text-neutral-500 uppercase font-bold mb-2">Bulk Add (comma separated)</div>
                <div className="flex gap-2">
                    <TextArea 
                        value={bulkSkillText}
                        onChange={(e) => setBulkSkillText(e.target.value)}
                        placeholder="e.g. Photoshop, Illustrator, After Effects"
                        className="h-10 min-h-0 bg-neutral-900 border border-neutral-700 text-white p-2 text-xs focus:outline-none focus:border-white placeholder-neutral-600"
                    />
                    <button 
                        onClick={handleBulkAddSkills}
                        className="bg-neutral-800 border border-neutral-700 text-white px-3 font-bold text-xs hover:bg-neutral-700 whitespace-nowrap"
                    >
                        Add
                    </button>
                </div>
           </div>
           
           <button 
              className="w-full mt-3 py-2 border border-dashed border-neutral-600 text-neutral-400 hover:border-white hover:text-white transition-colors text-xs font-bold uppercase tracking-wide"
              onClick={() => onChange({ ...data, skills: [...data.skills, { name: "", level: 3 }] })}
           >
              Add Single Skill
           </button>
        </div>
      )}
    </div>
  );
};
