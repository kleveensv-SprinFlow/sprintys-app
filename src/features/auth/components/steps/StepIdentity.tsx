import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Input } from '../../../../shared/components/Input';
import { StepTitle, StepFooter, ChoiceCard, FieldLabel } from './StepParts';

export const StepIdentity = ({ data, updateData, onNext, onBack }: any) => {
  const isValid = !!(data.firstName?.trim() && data.lastName?.trim() && data.gender);

  return (
    <View>
      <StepTitle title="Comment t’appelles-tu ?" subtitle="Ton coach et ton équipe te verront sous ce nom." />

      <Input
        label="Prénom"
        placeholder="Ton prénom"
        value={data.firstName}
        onChangeText={(text) => updateData({ firstName: text })}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
      />
      <Input
        label="Nom"
        placeholder="Ton nom"
        value={data.lastName}
        onChangeText={(text) => updateData({ lastName: text })}
        autoCapitalize="words"
        autoComplete="family-name"
        textContentType="familyName"
      />

      <FieldLabel>Sexe</FieldLabel>
      <View style={styles.choices}>
        <ChoiceCard
          icon="user"
          label="Homme"
          selected={data.gender === 'homme'}
          onPress={() => updateData({ gender: 'homme' })}
        />
        <ChoiceCard
          icon="user"
          label="Femme"
          selected={data.gender === 'femme'}
          onPress={() => updateData({ gender: 'femme' })}
        />
      </View>

      <StepFooter onBack={onBack} onNext={onNext} disabled={!isValid} />
    </View>
  );
};

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', gap: 10, marginBottom: 20 },
});
