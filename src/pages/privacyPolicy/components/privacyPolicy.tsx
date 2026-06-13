import React from 'react'
import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSettingsStore } from '@/pages/settings/stores'
import { useTranslation } from 'react-i18next'

const PrivacyPolicy = () => {
  const insets = useSafeAreaInsets()
  const appBackground = useSettingsStore(s => s.appBackground)
  const { t } = useTranslation()

  const renderBulletLines = (text: string) =>
    text.split('\n').map(line => (
      <Text key={line} style={styles.sectionText}>
        {line}
      </Text>
    ))

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: appBackground },
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('privacyPolicy.title')}</Text>
        <Text style={styles.updateDate}>{t('privacyPolicy.updatedAt')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('privacyPolicy.sections.collectionTitle')}
          </Text>
          <Text style={styles.sectionText}>
            {t('privacyPolicy.sections.collectionIntro')}
          </Text>
          {renderBulletLines(t('privacyPolicy.sections.collectionItems'))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('privacyPolicy.sections.usageTitle')}
          </Text>
          <Text style={styles.sectionText}>
            {t('privacyPolicy.sections.usageIntro')}
          </Text>
          {renderBulletLines(t('privacyPolicy.sections.usageItems'))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('privacyPolicy.sections.sharingTitle')}
          </Text>
          <Text style={styles.sectionText}>
            {t('privacyPolicy.sections.sharingIntro')}
          </Text>
          {renderBulletLines(t('privacyPolicy.sections.sharingItems'))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('privacyPolicy.sections.securityTitle')}
          </Text>
          <Text style={styles.sectionText}>
            {t('privacyPolicy.sections.securityIntro')}
          </Text>
          {renderBulletLines(t('privacyPolicy.sections.securityItems'))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('privacyPolicy.sections.rightsTitle')}
          </Text>
          <Text style={styles.sectionText}>
            {t('privacyPolicy.sections.rightsIntro')}
          </Text>
          {renderBulletLines(t('privacyPolicy.sections.rightsItems'))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('privacyPolicy.sections.contactTitle')}
          </Text>
          <Text style={styles.sectionText}>
            {t('privacyPolicy.sections.contactText')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('privacyPolicy.sections.updateTitle')}
          </Text>
          <Text style={styles.sectionText}>
            {t('privacyPolicy.sections.updateText')}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  updateDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
})

export default PrivacyPolicy
