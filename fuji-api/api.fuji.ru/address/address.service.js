import * as addressRepo from './address.repository.js';
import * as terminalsService from '../terminals/terminals.service.js';
import * as mapRepo from '../map/map.repository.js';
import CLogger from '../lib/CLogger.js';
import { validateAddress } from './address.helper.js';
import * as cityService from '../city/city.service.js';

const logger = new CLogger();

export const getAddresses = async () => {
  const addresses = await addressRepo.getAddresses();
  return addresses;
};

export const getAddressesByUserId = async (userId) => {
  try {
    const addresses = await addressRepo.getAddressesByUserId(userId);

    return await Promise.all(
      addresses.map(async (address) => {
        if (address?.streetId) {
          const city = await cityService.getCityByStreetId(address.streetId);
          if (!address?.street?.includes(city.name)) {
            address.street = `${city.name}, ${address.street}`;
          }
        }
        return address;
      }),
    );
  } catch (error) {
    console.log(error);
    throw error; // Обработка ошибок
  }
};

export const createAddress = async (address) => {
  await validateAddress(address);

  return addressRepo.createAddress(address);
};

export const updateAddress = async (id, address) => {
  const updatedAddress = await addressRepo.updateAddress(id, address);
  return updatedAddress;
};

export const deleteAddress = async (id) => {
  await addressRepo.deleteAddress(id);
};

export const isAddressAvailable = async (addressId) => {
  const address = await addressRepo.getAddressById(addressId);
  if (!address?.zoneId) {
    return false;
  }

  // Получаем зону по zoneId
  const zone = await mapRepo.getZoneById(address.zoneId);
  if (!zone?.terminal_id) {
    return false;
  }

  // Проверяем, доступен ли терминал с полученным terminal_id
  return await terminalsService.isTerminalAvailable(zone.terminal_id);
};

export const deleteAllAddressesByUserId = async (userId) => {
  try {
    return await addressRepo.deleteAllAddressesByUserId(userId);
  } catch (error) {
    logger.log(error);
    throw error;
  }
};
