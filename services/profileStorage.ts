import AsyncStorage from '@react-native-async-storage/async-storage';

// Contact data of the client kept on the device, keyed by e-mail. The backend register/login
// endpoints do not carry the phone yet (see the commit notes), so this is where it lives meanwhile.
const phoneKey = (email: string) => `car_advisor_phone:${email.trim().toLowerCase()}`;

export const getPhone = async (email: string): Promise<string | undefined> => {
  try {
    return (await AsyncStorage.getItem(phoneKey(email))) ?? undefined;
  } catch {
    return undefined;
  }
};

export const setPhone = (email: string, phone: string) => AsyncStorage.setItem(phoneKey(email), phone);
