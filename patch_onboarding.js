const fs = require('fs');

let code = fs.readFileSync('src/features/auth/components/RegisterMultiStep.tsx', 'utf8');

// Remove imports
code = code.replace("import { StepDiscipline } from './steps/StepDiscipline';\n", "");
code = code.replace("import { StepObjective } from './steps/StepObjective';\n", "");

// Remove disciplines from formData initial state
code = code.replace("    disciplines: [],\n", "");

// Change totalSteps
code = code.replace("const totalSteps = isCoach ? 4 : 6;", "const totalSteps = 4;");

// Replace renderStep
const oldRenderStep = `  const renderStep = () => {
    if (isCoach) {
      switch (step) {
        case 1:
          return <StepRole data={formData} updateData={updateData} onNext={handleNext} />;
        case 2:
          return <StepIdentity data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 3:
          return <StepCoachGroup data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 4:
          return <StepAccount
                    data={formData}
                    updateData={updateData}
                    onSubmit={handleSignup}
                    onBack={handleBack}
                    isLoading={isLoading}
                 />;
        default:
          return null;
      }
    } else {
      switch (step) {
        case 1:
          return <StepRole data={formData} updateData={updateData} onNext={handleNext} />;
        case 2:
          return <StepIdentity data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 3:
          return <StepDiscipline data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 4:
          return <StepPhysical data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 5:
          return <StepObjective data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        case 6:
          return <StepAccount
                    data={formData}
                    updateData={updateData}
                    onSubmit={handleSignup}
                    onBack={handleBack}
                    isLoading={isLoading}
                 />;
        default:
          return null;
      }
    }
  };`;

const newRenderStep = `  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepRole data={formData} updateData={updateData} onNext={handleNext} />;
      case 2:
        return <StepIdentity data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
      case 3:
        if (isCoach) {
          return <StepCoachGroup data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        } else {
          return <StepPhysical data={formData} updateData={updateData} onNext={handleNext} onBack={handleBack} />;
        }
      case 4:
        return <StepAccount
                  data={formData}
                  updateData={updateData}
                  onSubmit={handleSignup}
                  onBack={handleBack}
                  isLoading={isLoading}
               />;
      default:
        return null;
    }
  };`;

code = code.replace(oldRenderStep, newRenderStep);

fs.writeFileSync('src/features/auth/components/RegisterMultiStep.tsx', code);
console.log("Patched RegisterMultiStep");
